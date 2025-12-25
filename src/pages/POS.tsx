import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Minus, Plus, ShoppingCart, Trash2, Printer } from "lucide-react";
import { getInventoryItems } from "@/services/inventoryService";
import { createSale } from "@/services/salesService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartItem extends InventoryItem {
  cartQuantity: number;
}

const POS = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadItems = async () => {
    const { data, error } = await getInventoryItems();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Filter items with quantity > 0 and map to required fields
      const availableItems = (data || []).filter(item => item.retailQuantity > 0).map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.retailQuantity,
      }));
      setItems(availableItems);
    }
  };

  const addToCart = (item: InventoryItem) => {
    const existingItem = cart.find((i) => i.id === item.id);
    
    if (existingItem) {
      if (existingItem.cartQuantity >= item.quantity) {
        toast({
          title: "Error",
          description: "Not enough stock",
          variant: "destructive",
        });
        return;
      }
      setCart(
        cart.map((i) =>
          i.id === item.id ? { ...i, cartQuantity: i.cartQuantity + 1 } : i
        )
      );
    } else {
      setCart([...cart, { ...item, cartQuantity: 1 }]);
    }
  };

  const updateCartQuantity = (id: string, quantity: number) => {
    const item = cart.find((i) => i.id === id);
    if (!item) return;

    if (quantity <= 0) {

      
      removeFromCart(id);
      return;
    }

    if (quantity > item.quantity) {
      toast({
        title: "Error",
        description: "Not enough stock",
        variant: "destructive",
      });
      return;
    }

    setCart(cart.map((i) => (i.id === id ? { ...i, cartQuantity: quantity } : i)));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((i) => i.id !== id));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      // Create sale with items
      const saleData = {
        totalAmount: calculateTotal(),
        paymentMethod: paymentMethod,
        customerName: customerName || null,
        sales: cart.map((item) => ({
          inventoryItemId: item.id,
          quantity: item.cartQuantity,
          price: item.price,
          subTotal: item.price * item.cartQuantity,
        })),
      };

      const { data, error } = await createSale(saleData);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Success",
        description: "Sale completed successfully",
      });

      // Print receipt
      if (data?.id) {
        printReceipt(data.id);
      }

      // Reset
      setCart([]);
      setCustomerName("");
      loadItems();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete sale",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = (saleId: string) => {
    const receiptContent = `
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .items { margin: 20px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; font-size: 1.2em; margin-top: 20px; padding-top: 10px; border-top: 2px solid #000; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Inventory POS</h2>
            <p>Receipt #${saleId}</p>
            <p>${new Date().toLocaleString()}</p>
            ${customerName ? `<p>Customer: ${customerName}</p>` : ''}
          </div>
          <div class="items">
            ${cart.map(item => `
              <div class="item">
                <span>${item.name} x ${item.cartQuantity}</span>
                <span>$${(item.price * item.cartQuantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="total">
            <div class="item">
              <span>Total:</span>
              <span>$${calculateTotal().toFixed(2)}</span>
            </div>
            <div class="item">
              <span>Payment Method:</span>
              <span>${paymentMethod.toUpperCase()}</span>
            </div>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <p>Thank you for your business!</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Point of Sale</h1>
          <p className="text-muted-foreground">Process sales transactions</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Items Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Items</CardTitle>
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/10 cursor-pointer"
                    onClick={() => addToCart(item)}
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Stock: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">${item.price.toFixed(2)}</p>
                      <Button size="sm" variant="ghost">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No items available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Shopping Cart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${item.price.toFixed(2)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.cartQuantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-right w-20">
                        <p className="font-bold">
                          ${(item.price * item.cartQuantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Cart is empty</p>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer Name (Optional)</Label>
                    <Input
                      id="customer"
                      placeholder="Enter customer name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger id="payment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="mobile">Mobile Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between text-xl font-bold pt-2">
                    <span>Total:</span>
                    <span className="text-primary">${calculateTotal().toFixed(2)}</span>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || processing}
                  >
                    {processing ? (
                      "Processing..."
                    ) : (
                      <>
                        <Printer className="h-4 w-4 mr-2" />
                        Complete Sale
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default POS;

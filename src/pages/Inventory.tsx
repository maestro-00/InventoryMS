import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Upload, Search } from "lucide-react";
import { getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem, uploadInventoryImage } from "@/services/inventoryService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  retailQuantity: number | null;
  quantity: number;
  reorder_level: number;
  image_url: string | null;
  category: string | null;
}

const Inventory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    price: "",
    retailQuantity: "",
    quantity: "0",
    reorder_level: "10",
    category: "",
    image_url: "",
  });

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
      setItems(data || []);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const { data, error } = await uploadInventoryImage(file);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setFormData({ ...formData, image_url: data.url });
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    }
    setUploading(false);
  };

  const validateRetailQuantity = () => { 
    if(formData.retailQuantity > formData.quantity) {
      return "Retail quantity cannot be more than specified item quantity."
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate retailQuantity
    const retailQuantityError = validateRetailQuantity();
    if (retailQuantityError) {
      toast({
        title: "Invalid Password",
        description: retailQuantityError,
        variant: "destructive",
      }); 
      return;
    }

    const itemData = {
      name: formData.name,
      description: formData.description || null,
      sku: formData.sku || null,
      price: parseFloat(formData.price),
      retailQuantity: formData.retailQuantity ? parseFloat(formData.retailQuantity) : null,
      totalAmount: parseInt(formData.quantity),
      reorder_level: parseInt(formData.reorder_level),
      category: formData.category || null,
      typeId: 1,
      image_url: formData.image_url || null,
    };

    if (editingItem) {
      const { error } = await updateInventoryItem(editingItem.id, itemData);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Item updated successfully",
        });
        setEditingItem(null);
        resetForm();
        loadItems();
      }
    } else {
      const { error } = await createInventoryItem(itemData);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Item added successfully",
        });
        setIsAddDialogOpen(false);
        resetForm();
        loadItems();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    const { error } = await deleteInventoryItem(id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      loadItems();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      sku: "",
      price: "",
      retailQuantity: "",
      quantity: "0",
      reorder_level: "10",
      category: "",
      image_url: "",
    });
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      sku: item.sku || "",
      price: item.price.toString(),
      retailQuantity: item.retailQuantity?.toString() || "",
      quantity: item.quantity.toString(),
      reorder_level: item.reorder_level.toString(),
      category: item.category || "",
      image_url: item.image_url || "",
    });
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Inventory</h1>
            <p className="text-muted-foreground">Manage your inventory items</p>
          </div>
          <Dialog open={isAddDialogOpen || !!editingItem} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setEditingItem(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Update the item details" : "Add a new item to your inventory"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Selling Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retailQuantity">Retail Quantity</Label>
                    <Input
                      id="retailQuantity"
                      type="number"
                      step="0.01"
                      value={formData.retailQuantity }
                      onChange={(e) => setFormData({ ...formData, retailQuantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorder_level">Reorder Level</Label>
                    <Input
                      id="reorder_level"
                      type="number"
                      value={formData.reorder_level}
                      onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Item Image</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    {formData.image_url && (
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="h-16 w-16 object-cover rounded"
                      />
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  {editingItem ? "Update Item" : "Add Item"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    {item.category && (
                      <CardDescription className="text-xs">{item.category}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {item.description && (
                  <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                )}
                <div className="space-y-2 text-sm">
                  {item.sku && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SKU:</span>
                      <span className="font-medium">{item.sku}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantity:</span>
                    <span className={`font-medium ${item.quantity < item.reorder_level ? 'text-destructive' : 'text-accent'}`}>
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-medium">${item.price.toFixed(2)}</span>
                  </div>
                  {item.retailQuantity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Retail Quantity:</span>
                      <span className="font-medium">${item.retailQuantity.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <Card className="p-12 text-center">
            <CardDescription>No items found. Add your first inventory item to get started.</CardDescription>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Inventory;

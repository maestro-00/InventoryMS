import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react"; 
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { createInventoryItemType, deleteInventoryItemType, getInventoryItemTypes, InventoryItemType, updateInventoryItemType } from "@/services/inventoryTypeService";

interface InventoryType {
  id: number;
  name: string; 
}

const InventoryType = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [types, setTypes] = useState<InventoryItemType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<InventoryType | null>(null); 
  const [formData, setFormData] = useState({
    name: ""
  });

  useEffect(() => {
    if (user) {
      loadTypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadTypes = async () => {
    const { data, error } = await getInventoryItemTypes();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTypes(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const typeData = {
      name: formData.name
    };

    if (editingType) {
      const { error } = await updateInventoryItemType(editingType.id.toString(), typeData);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Item type updated successfully",
        });
        setEditingType(null);
        resetForm();
        loadTypes();
      }
    } else {
      const { error } = await createInventoryItemType(typeData);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Item type added successfully",
        });
        setIsAddDialogOpen(false);
        resetForm();
        loadTypes();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this type?")) return;

    const { error } = await deleteInventoryItemType(id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Type deleted successfully",
      });
      loadTypes();
    }
  };

  const resetForm = () => {
    setFormData({
      name: ""
    });
  };

  const startEdit = (type: InventoryType) => {
    setEditingType(type);
    setFormData({
      name: type.name
    });
  };

  const filteredTypes = types.filter(
    (type) =>
      type.name.toLowerCase().includes(searchTerm.toLowerCase()) 
  );

  return (
    <Layout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Inventory Types</h1>
            <p className="text-muted-foreground">Manage your inventory types</p>
          </div>
          <Dialog open={isAddDialogOpen || !!editingType} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setEditingType(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingType ? "Edit Type" : "Add New Type"}</DialogTitle>
                <DialogDescription>
                  {editingType ? "Update the type name" : "Add a new type to your inventory"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid">
                  <div className="space-y-2">
                    <Label htmlFor="name">Type Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  {editingType ? "Update Type" : "Add Type"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTypes.map((type,index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{type.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(type)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(type.id.toString())}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {filteredTypes.length === 0 && (
          <Card className="p-12 text-center">
            <CardDescription>No types found. Add your first inventory type to get started.</CardDescription>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default InventoryType;

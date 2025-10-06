import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, TrendingUp, AlertCircle } from "lucide-react";
import { getSalesStats } from "@/services/salesService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    todaySales: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const { data, error } = await getSalesStats();

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setStats({
          totalItems: data.totalItems,
          lowStock: data.lowStock,
          todaySales: data.todaySales,
          totalRevenue: data.totalRevenue,
        });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    }
  };

  const statCards = [
    {
      title: "Total Items",
      value: stats.totalItems,
      icon: Package,
      description: "Items in inventory",
      color: "text-primary",
    },
    {
      title: "Low Stock",
      value: stats.lowStock,
      icon: AlertCircle,
      description: "Items need reorder",
      color: "text-destructive",
    },
    {
      title: "Today's Sales",
      value: `$${stats.todaySales.toFixed(2)}`,
      icon: ShoppingCart,
      description: "Revenue today",
      color: "text-accent",
    },
    {
      title: "Total Revenue",
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: TrendingUp,
      description: "All time revenue",
      color: "text-accent",
    },
  ];

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your inventory and sales</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <a
                href="/inventory"
                className="p-4 border rounded-lg hover:bg-accent/10 transition-colors cursor-pointer"
              >
                <Package className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold mb-1">Manage Inventory</h3>
                <p className="text-sm text-muted-foreground">Add or update inventory items</p>
              </a>
              <a
                href="/pos"
                className="p-4 border rounded-lg hover:bg-accent/10 transition-colors cursor-pointer"
              >
                <ShoppingCart className="h-8 w-8 text-accent mb-2" />
                <h3 className="font-semibold mb-1">Record Sale</h3>
                <p className="text-sm text-muted-foreground">Process a new transaction</p>
              </a>
              <a
                href="/analytics"
                className="p-4 border rounded-lg hover:bg-accent/10 transition-colors cursor-pointer"
              >
                <TrendingUp className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold mb-1">View Analytics</h3>
                <p className="text-sm text-muted-foreground">Check sales performance</p>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

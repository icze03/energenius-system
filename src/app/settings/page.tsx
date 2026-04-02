'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { Mail, Phone, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { ReportIssueForm } from "@/components/settings/report-issue-form";
import { Separator } from "@/components/ui/separator";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string({ required_error: "Please enter an email." }).email(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [kwhPrice, setKwhPrice] = useState<string>('');

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: "", email: "" },
    mode: "onChange",
  });

  useEffect(() => {
    const savedPrice = localStorage.getItem('phpPerKwh');
    if (savedPrice) setKwhPrice(savedPrice);

    if (user && !loading) {
      if (user.metadata.lastSignInTime) {
        setLastLogin(new Date(user.metadata.lastSignInTime).toLocaleString());
      }
      const fetchProfile = async () => {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          form.reset({ name: userData.name || user.displayName || '', email: userData.email || user.email || '' });
        } else {
          form.reset({ name: user.displayName || '', email: user.email || '' });
        }
      };
      fetchProfile();
    }
  }, [user, loading, form]);

  async function onProfileSubmit(data: ProfileFormValues) {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to update your profile." });
      return;
    }
    try {
      await setDoc(doc(db, "users", user.uid), { name: data.name }, { merge: true });
      toast({ title: "Profile updated!", description: "Your company profile has been successfully updated." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not update your profile. Please try again." });
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/');
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to log out. Please try again." });
    }
  };

  const handleSaveRate = () => {
    if (kwhPrice === '' || isNaN(parseFloat(kwhPrice))) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a valid number for the kWh price.' });
      return;
    }
    localStorage.setItem('phpPerKwh', kwhPrice);
    toast({ title: 'Rate Saved!', description: `Electricity rate set to ₱${kwhPrice}/kWh.` });
  };

  if (loading) return <div className="flex h-full w-full items-center justify-center">Loading settings...</div>;
  if (!user) return null;

  return (
    <div className="space-y-6">
      <CardHeader className="px-0">
        <CardTitle>Settings</CardTitle>
        <CardDescription>Manage your account settings and application preferences.</CardDescription>
      </CardHeader>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your company's public information.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl><Input placeholder="Your company name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl><Input placeholder="contact@yourcompany.com" {...field} disabled /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit">Update Profile</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label className="text-base font-medium">Theme</Label>
                <p className="text-sm text-muted-foreground">Select the theme for the application.</p>
                <RadioGroup defaultValue={theme} className="grid max-w-md grid-cols-2 gap-4 pt-2" onValueChange={setTheme}>
                  <div>
                    <RadioGroupItem value="light" id="light" className="peer sr-only" />
                    <Label htmlFor="light" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                      Light
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                    <Label htmlFor="dark" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                      Dark
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure billing rate for cost estimations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Billing Rate</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Set the electricity rate to ensure cost estimations are accurate. Based on your latest bill (e.g., Meralco).
                </p>
                <div className="flex items-center space-x-2 max-w-sm">
                  <Label htmlFor="kwh-price" className="text-muted-foreground">₱</Label>
                  <Input
                    id="kwh-price"
                    type="number"
                    placeholder="e.g., 11.50"
                    value={kwhPrice}
                    onChange={(e) => setKwhPrice(e.target.value)}
                  />
                  <span className="text-muted-foreground">/ kWh</span>
                </div>
                <Button onClick={handleSaveRate} className="mt-4">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Save Rate
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support">
          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>Have a question or need help? Reach out to us or submit a report.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4 rounded-md border p-4">
                <Mail className="h-6 w-6 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">Email</p>
                  <a href="mailto:kleinimperio03@gmail.com" className="text-sm text-muted-foreground hover:underline">
                    kleinimperio03@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-center space-x-4 rounded-md border p-4">
                <Phone className="h-6 w-6 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">Phone</p>
                  <p className="text-sm text-muted-foreground">+63 995 640 5671</p>
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="text-lg font-medium mb-2">Report an Issue</h3>
                <ReportIssueForm />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Manage your account and log out.
                {lastLogin && <span className="block mt-1">Last logged in: {lastLogin}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label className="text-base font-medium">Log Out</Label>
                <p className="text-sm text-muted-foreground">You will be returned to the login screen.</p>
                <Button variant="destructive" onClick={handleLogout}>Log Out</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
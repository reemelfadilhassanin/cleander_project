import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { CategoryProvider } from "@/context/CategoryContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import CalendarPage from "@/pages/CalendarPage";
import ConverterPage from "@/pages/ConverterPage";
import AuthPage from "@/pages/AuthPage";
import AdminPage from "@/pages/AdminPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import AdminEditUserPage from "@/pages/AdminEditUserPage";
import AdminUserEventsPage from "@/pages/AdminUserEventsPage";
import AdminEventsPage from "@/pages/AdminEventsPage";
import AdminMaintenancePage from "@/pages/AdminMaintenancePage";
import AdminPrivacyPolicyPage from "@/pages/AdminPrivacyPolicyPage";
import AdminTermsPage from "@/pages/AdminTermsPage";
import AgeCalculatorPage from "@/pages/AgeCalculatorPage";
import EventsPage from "@/pages/EventsPage";
import EventDetailsPage from "@/pages/EventDetailsPage";
import AddCategoryPage from "@/pages/AddCategoryPage";
import AddEventPage from "@/pages/AddEventPage";
import EditEventPage from "@/pages/EditEventPage";
import CategoriesPage from "@/pages/CategoriesPage";
import EditCategoryPage from "@/pages/EditCategoryPage";
import NotFound from "@/pages/not-found";
import { useState } from "react";
import BottomNavigation from "@/components/BottomNavigation";
import UserHeader from "@/components/UserHeader";

function Router() {
  const [activeTab, setActiveTab] = useState<string>("calendar");

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <UserHeader />
      
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/" component={CalendarPage} />
        <ProtectedRoute path="/calendar" component={CalendarPage} />
        <ProtectedRoute path="/converter" component={ConverterPage} />
        <ProtectedRoute path="/age-calculator" component={AgeCalculatorPage} />
        <ProtectedRoute path="/events" component={EventsPage} />
        <ProtectedRoute path="/events/:id" component={EventDetailsPage} />
        <ProtectedRoute path="/categories" component={CategoriesPage} />
        <ProtectedRoute path="/add-category" component={AddCategoryPage} />
        <ProtectedRoute path="/edit-category/:id" component={EditCategoryPage} />
        <ProtectedRoute path="/add-event" component={AddEventPage} />
        <ProtectedRoute path="/events/edit/:id" component={EditEventPage} />
        
        {/* مسارات لوحة الإدارة */}
        <ProtectedRoute path="/admin" component={AdminPage} adminOnly={true} />
        <ProtectedRoute path="/admin/users" component={AdminUsersPage} adminOnly={true} />
        <ProtectedRoute path="/admin/user/:id/edit" component={AdminEditUserPage} adminOnly={true} />
        <ProtectedRoute path="/admin/user/:id/events" component={AdminUserEventsPage} adminOnly={true} />
        <ProtectedRoute path="/admin/events" component={AdminEventsPage} adminOnly={true} />
        <ProtectedRoute path="/admin/maintenance" component={AdminMaintenancePage} adminOnly={true} />
        <ProtectedRoute path="/admin/privacy" component={AdminPrivacyPolicyPage} adminOnly={true} />
        <ProtectedRoute path="/admin/terms" component={AdminTermsPage} adminOnly={true} />
        
        <Route component={NotFound} />
      </Switch>
      
      <BottomNavigation activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CategoryProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </CategoryProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

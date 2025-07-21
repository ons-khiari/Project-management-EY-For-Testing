"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  User,
  Building,
  Heart,
  Info,
  Mail,
  Phone,
  Globe,
  MapPin,
  Briefcase,
  Users,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ClientType } from "@/app/types/client";
import withAuthAdmin from "@/HOC/withAuthAdmin";
import { clientApi } from "@/services/client-api";

const AddClientPage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientType, setClientType] = useState<ClientType>("Company");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    industry: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
    projects: [],
  });

  const validateForm = (clientType: string) => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";

    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email))
      newErrors.email = "Invalid email format";

    if (!formData.phone.trim()) newErrors.phone = "Phone is required";

    if (!formData.address.trim()) newErrors.address = "Address is required";

    if (!formData.website.trim()) newErrors.website = "Website is required";

    // Validate these fields ONLY if the client is not an Individual
    if (clientType !== "Individual") {
      if (!formData.industry.trim())
        newErrors.industry = "Industry is required";

      if (!formData.contactPerson.trim())
        newErrors.contactPerson = "Contact person is required";

      if (!formData.contactEmail.trim())
        newErrors.contactEmail = "Contact email is required";
      else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.contactEmail))
        newErrors.contactEmail = "Invalid contact email";

      if (!formData.contactPhone.trim())
        newErrors.contactPhone = "Contact phone is required";
    }

    return newErrors;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClientTypeChange = (value: string) => {
    setClientType(value as ClientType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(clientType);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      let clientData = { ...formData, type: clientType };

      // For individual clients, set the company-specific fields to empty strings
      if (clientType === "Individual") {
        clientData = {
          ...clientData,
          contactPerson: "__",
          contactEmail: "__@__",
          contactPhone: "000-000-0000",
          industry: "__",
        };
      }
      const response = await clientApi.createClient(clientData);

      if (response.success) {
        router.push("/clients");
      } else {
        console.error("Error adding client:", response.message);
      }
    } catch (error) {
      console.error("Error adding client:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50 pb-10">
          <div className="mx-auto max-w-4xl px-4 py-8">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.back()}
                  className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  <Link
                    href="/clients"
                    className="text-gray-500 hover:text-[#F5DC00] transition-colors"
                  >
                    Clients
                  </Link>
                  <span className="text-gray-500">/</span>
                  <span className="font-medium text-[#444444]">
                    Add New Client
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-5">
                <h1 className="text-xl font-semibold text-[#444444]">
                  Add New Client
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Fill in the details below to add a new client to your system.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="mb-8 space-y-8">
                  {/* Client Type Selection */}
                  <div>
                    <h2 className="mb-4 text-base font-medium text-[#444444]">
                      Client Type
                    </h2>
                    <RadioGroup
                      value={clientType}
                      onValueChange={handleClientTypeChange}
                      className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4"
                    >
                      <div>
                        <RadioGroupItem
                          value="Company"
                          id="Company"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="Company"
                          className={cn(
                            "flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-[#F5DC00] [&:has([data-state=checked])]:border-[#F5DC00] transition-all",
                            clientType === "Company" && "bg-[#F5DC00]/10"
                          )}
                        >
                          <Building2
                            className={cn(
                              "mb-3 h-6 w-6 text-gray-500",
                              clientType === "Company" && "text-[#F5DC00]"
                            )}
                          />
                          <div className="text-sm font-medium">Company</div>
                        </Label>
                      </div>

                      <div>
                        <RadioGroupItem
                          value="Individual"
                          id="Individual"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="Individual"
                          className={cn(
                            "flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-[#F5DC00] [&:has([data-state=checked])]:border-[#F5DC00] transition-all",
                            clientType === "Individual" && "bg-[#F5DC00]/10"
                          )}
                        >
                          <User
                            className={cn(
                              "mb-3 h-6 w-6 text-gray-500",
                              clientType === "Individual" && "text-[#F5DC00]"
                            )}
                          />
                          <div className="text-sm font-medium">Individual</div>
                        </Label>
                      </div>

                      <div>
                        <RadioGroupItem
                          value="Government"
                          id="Government"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="Government"
                          className={cn(
                            "flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-[#F5DC00] [&:has([data-state=checked])]:border-[#F5DC00] transition-all",
                            clientType === "Government" && "bg-[#F5DC00]/10"
                          )}
                        >
                          <Building
                            className={cn(
                              "mb-3 h-6 w-6 text-gray-500",
                              clientType === "Government" && "text-[#F5DC00]"
                            )}
                          />
                          <div className="text-sm font-medium">Government</div>
                        </Label>
                      </div>

                      <div>
                        <RadioGroupItem
                          value="NonProfit"
                          id="NonProfit"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="NonProfit"
                          className={cn(
                            "flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-[#F5DC00] [&:has([data-state=checked])]:border-[#F5DC00] transition-all",
                            clientType === "NonProfit" && "bg-[#F5DC00]/10"
                          )}
                        >
                          <Heart
                            className={cn(
                              "mb-3 h-6 w-6 text-gray-500",
                              clientType === "NonProfit" && "text-[#F5DC00]"
                            )}
                          />
                          <div className="text-sm font-medium">Non Profit</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Basic Information */}
                  <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
                    <h2 className="mb-5 flex items-center gap-2 text-base font-medium text-[#444444]">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5DC00]/20">
                        <Info className="h-4 w-4 text-[#444444]" />
                      </div>
                      Basic Information
                    </h2>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="name"
                          className="text-sm font-medium text-gray-700"
                        >
                          {clientType === "Individual"
                            ? "Full Name"
                            : "Organization Name"}{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder={
                            clientType === "Individual"
                              ? "John Doe"
                              : "Acme Corporation"
                          }
                          className="w-full border-gray-200 focus:border-[#F5DC00] focus:ring-[#F5DC00]/20 placeholder:text-gray-300"
                        />
                        {errors.name && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.name}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="email"
                          className="text-sm font-medium text-gray-700"
                        >
                          Email Address <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="email@example.com"
                            className="pl-10 border-gray-200 focus:border-[#F5DC00] focus:ring-[#F5DC00]/20 placeholder:text-gray-300"
                          />
                        </div>
                        {errors.email && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.email}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="phone"
                          className="text-sm font-medium text-gray-700"
                        >
                          Phone Number
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+1 (555) 123-4567"
                            className="pl-10 border-gray-200 focus:border-[#F5DC00] focus:ring-[#F5DC00]/20 placeholder:text-gray-300"
                          />
                        </div>
                        {errors.phone && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.phone}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="website"
                          className="text-sm font-medium text-gray-700"
                        >
                          Website
                        </Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            id="website"
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            placeholder="www.example.com"
                            className="pl-10 border-gray-200 focus:border-[#F5DC00] focus:ring-[#F5DC00]/20 placeholder:text-gray-300"
                          />
                        </div>
                        {errors.website && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.website}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label
                          htmlFor="address"
                          className="text-sm font-medium text-gray-700"
                        >
                          Address
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Textarea
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="123 Business Ave, City, State, ZIP"
                            className="min-h-[80px] pl-10 border-gray-200 focus:border-[#F5DC00] focus:ring-[#F5DC00]/20 placeholder:text-gray-300"
                          />
                        </div>
                        {errors.address && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.address}
                          </p>
                        )}
                      </div>

                      {clientType !== "Individual" && (
                        <div className="space-y-2">
                          <Label
                            htmlFor="industry"
                            className="text-sm font-medium text-gray-700"
                          >
                            Industry
                          </Label>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              id="industry"
                              name="industry"
                              value={formData.industry}
                              onChange={handleChange}
                              placeholder="Technology, Healthcare, etc."
                              className="pl-10 border-gray-200 focus:border-[#F5DC00] focus:ring-[#F5DC00]/20 placeholder:text-gray-300"
                            />
                          </div>
                          {errors.industry && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.industry}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Person (for non-individual clients) */}
                  {clientType !== "Individual" && (
                    <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
                      <h2 className="mb-5 flex items-center gap-2 text-base font-medium text-[#444444]">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5DC00]/20">
                          <Users className="h-4 w-4 text-[#444444]" />
                        </div>
                        Contact Person
                      </h2>
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="contactPerson"
                            className="text-sm font-medium text-gray-700"
                          >
                            Contact Name
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              id="contactPerson"
                              name="contactPerson"
                              value={formData.contactPerson}
                              onChange={handleChange}
                              placeholder="John Smith"
                              className="pl-10 border-gray-200 focus:border-[#F5DC00] focus:ring-[#F5DC00]/20 placeholder:text-gray-300"
                            />
                          </div>
                          {errors.contactPerson && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.contactPerson}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="contactEmail"
                            className="text-sm font-medium text-gray-700"
                          >
                            Contact Email
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              id="contactEmail"
                              name="contactEmail"
                              type="email"
                              value={formData.contactEmail}
                              onChange={handleChange}
                              placeholder="contact@example.com"
                              className="pl-10 border-gray-200 focus:border-[#F5DC00] focus:ring-[#F5DC00]/20 placeholder:text-gray-300"
                            />
                          </div>
                          {errors.contactEmail && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.contactEmail}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="contactPhone"
                            className="text-sm font-medium text-gray-700"
                          >
                            Contact Phone
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              id="contactPhone"
                              name="contactPhone"
                              value={formData.contactPhone}
                              onChange={handleChange}
                              placeholder="+1 (555) 123-4567"
                              className="pl-10 border-gray-200 focus:border-[#F5DC00] focus:ring-[#F5DC00]/20 placeholder:text-gray-300"
                            />
                          </div>
                          {errors.contactPhone && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.contactPhone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Information */}
                  <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
                    <h2 className="mb-5 flex items-center gap-2 text-base font-medium text-[#444444]">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5DC00]/20">
                        <Info className="h-4 w-4 text-[#444444]" />
                      </div>
                      Additional Information
                    </h2>
                    <div className="space-y-2">
                      <Label
                        htmlFor="notes"
                        className="text-sm font-medium text-gray-700"
                      >
                        Notes
                      </Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="Add any additional information about this client..."
                        className="min-h-[120px] border-gray-200 focus:border-[#F5DC00] focus:ring-[#F5DC00]/20 placeholder:text-gray-340"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#F5DC00] text-[#444444] hover:bg-[#e6cf00] transition-colors flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      "Adding Client..."
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Add Client
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default withAuthAdmin(AddClientPage); // Protect the page with the HOC

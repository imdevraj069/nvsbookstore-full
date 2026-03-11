"use client";

import { useState, useEffect } from "react";
import { adminAPI } from "@/lib/api";
import { Save, AlertTriangle, CheckCircle, Loader2, Eye, EyeOff, Upload, Plus, X } from "lucide-react";

export default function SiteSettingsTab() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [activeSection, setActiveSection] = useState("company");
  const [maintenancePreview, setMaintenancePreview] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPath, setLogoPath] = useState("");
  const [serverImages, setServerImages] = useState([]);
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    // Site Status
    isMaintenanceMode: false,
    maintenanceMessage: "We are undergoing scheduled maintenance. We will be back soon!",
    // Company Details
    companyName: "NVS BookStore",
    companyTagline: "Your One-Stop Destination for Competitive Exam Books",
    companyEmail: "support@nvsbookstore.com",
    companyPhone: "+91-XXXX-XXXX",
    companyAddress: "",
    companyWebsite: "https://nvsbookstore.com",
    // Invoice Details
    invoiceCompanyName: "NVS BookStore",
    invoiceCompanyEmail: "support@nvsbookstore.com",
    invoiceCompanyPhone: "+91-XXXX-XXXX",
    invoiceCompanyAddress: "",
    invoiceCompanyLogo: "📚",
    invoiceGSTNumber: "",
    invoicePAN: "",
    invoiceBankName: "",
    invoiceBankAccountNumber: "",
    invoiceBankIFSC: "",
    invoiceFooterText: "Thank you for your purchase! We appreciate your business.",
  });

  useEffect(() => {
    loadSettings();
    loadServerImages();
  }, []);

  const loadServerImages = async () => {
    try {
      const response = await adminAPI.getServerImages();
      setServerImages(response.data || []);
    } catch (err) {
      console.warn("Failed to load server images:", err);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getSettings();
      if (res.success && res.data) {
        setSettings(res.data);
        setForm({
          isMaintenanceMode: res.data.isMaintenanceMode || false,
          maintenanceMessage: res.data.maintenanceMessage || "We are undergoing scheduled maintenance. We will be back soon!",
          companyName: res.data.companyName || "NVS BookStore",
          companyTagline: res.data.companyTagline || "Your One-Stop Destination for Competitive Exam Books",
          companyEmail: res.data.companyEmail || "support@nvsbookstore.com",
          companyPhone: res.data.companyPhone || "+91-XXXX-XXXX",
          companyAddress: res.data.companyAddress || "",
          companyWebsite: res.data.companyWebsite || "https://nvsbookstore.com",
          invoiceCompanyName: res.data.invoiceCompanyName || "NVS BookStore",
          invoiceCompanyEmail: res.data.invoiceCompanyEmail || "support@nvsbookstore.com",
          invoiceCompanyPhone: res.data.invoiceCompanyPhone || "+91-XXXX-XXXX",
          invoiceCompanyAddress: res.data.invoiceCompanyAddress || "",
          invoiceCompanyLogo: res.data.invoiceCompanyLogo || "📚",
          invoiceGSTNumber: res.data.invoiceGSTNumber || "",
          invoicePAN: res.data.invoicePAN || "",
          invoiceBankName: res.data.invoiceBankName || "",
          invoiceBankAccountNumber: res.data.invoiceBankAccountNumber || "",
          invoiceBankIFSC: res.data.invoiceBankIFSC || "",
          invoiceFooterText: res.data.invoiceFooterText || "Thank you for your purchase! We appreciate your business.",
        });
        // Set logo path if exists
        setLogoPath(res.data.invoiceCompanyLogo || "");
      }
    } catch (error) {
      setSaveError("Failed to load settings: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const response = await adminAPI.uploadServerImage(fd);
      setLogoPath(response.data.fileName);
      setLogoFile(null);
      updateField("invoiceCompanyLogo", response.data.fileName);
      await loadServerImages();
    } catch (err) {
      setSaveError("Failed to upload logo: " + err.message);
    } finally {
      setImageUploadLoading(false);
    }
  };

  const selectLogoFromDirectory = (imagePath) => {
    setLogoPath(imagePath);
    updateField("invoiceCompanyLogo", imagePath);
    setShowLogoPicker(false);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      let saveForm = { ...form };
      
      // If there's a logo file upload, use the path from state
      if (logoPath && !logoFile) {
        saveForm.invoiceCompanyLogo = logoPath;
      }

      const res = await adminAPI.updateCompanySettings(saveForm);
      if (res.success) {
        setSaveSuccess(true);
        setSettings(res.data);
        setLogoFile(null);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(res.error || "Failed to save settings");
      }
    } catch (error) {
      setSaveError("Error saving settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    try {
      const res = await adminAPI.toggleMaintenanceMode();
      if (res.success) {
        setForm((prev) => ({
          ...prev,
          isMaintenanceMode: !prev.isMaintenanceMode,
        }));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      setSaveError("Error toggling maintenance mode: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {saveSuccess && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-800">Settings saved successfully!</span>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-800">{saveError}</span>
        </div>
      )}

      {/* Maintenance Mode Alert */}
      {form.isMaintenanceMode && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-800 font-medium">⚠️ Website is in Maintenance Mode</span>
        </div>
      )}

      {/* Section Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: "maintenance", label: "🔧 Maintenance", icon: null },
          { id: "company", label: "🏢 Company", icon: null },
          { id: "invoice", label: "📄 Invoice", icon: null },
        ].map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeSection === section.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {/* MAINTENANCE MODE SECTION */}
        {activeSection === "maintenance" && (
          <div className="space-y-6">
            <div className="border-l-4 border-yellow-500 pl-4 py-2">
              <h3 className="text-lg font-semibold text-gray-900">Maintenance Mode</h3>
              <p className="text-sm text-gray-600 mt-1">Control whether your website is online or in maintenance mode</p>
            </div>

            {/* Toggle Button */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Enable Maintenance Mode</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {form.isMaintenanceMode ? "✓ Website is currently offline" : "• Website is currently online"}
                </p>
              </div>
              <button
                onClick={toggleMaintenanceMode}
                className={`relative inline-flex h-8 w-16 rounded-full transition-colors ${
                  form.isMaintenanceMode ? "bg-red-600" : "bg-green-600"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    form.isMaintenanceMode ? "translate-x-9" : "translate-x-1"
                  } mt-1`}
                />
              </button>
            </div>

            {/* Maintenance Message */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Maintenance Message
              </label>
              <textarea
                value={form.maintenanceMessage}
                onChange={(e) => updateField("maintenanceMessage", e.target.value)}
                placeholder="Message to display to visitors during maintenance"
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">This message will be shown when maintenance mode is enabled</p>
            </div>

            {/* Preview */}
            <div>
              <button
                onClick={() => setMaintenancePreview(!maintenancePreview)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {maintenancePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {maintenancePreview ? "Hide" : "Show"} Preview
              </button>
              {maintenancePreview && (
                <div className="mt-4 p-6 bg-gray-900 rounded-lg text-center text-white">
                  <h2 className="text-2xl font-bold mb-4">Maintenance</h2>
                  <p className="text-gray-300">{form.maintenanceMessage}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMPANY DETAILS SECTION */}
        {activeSection === "company" && (
          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="text-lg font-semibold text-gray-900">Company Details</h3>
              <p className="text-sm text-gray-600 mt-1">Update your company information displayed across the site</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Company Name"
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
              />
              <InputField
                label="Company Tagline"
                value={form.companyTagline}
                onChange={(e) => updateField("companyTagline", e.target.value)}
              />
              <InputField
                label="Company Email"
                type="email"
                value={form.companyEmail}
                onChange={(e) => updateField("companyEmail", e.target.value)}
              />
              <InputField
                label="Company Phone"
                value={form.companyPhone}
                onChange={(e) => updateField("companyPhone", e.target.value)}
              />
              <InputField
                label="Company Website"
                type="url"
                value={form.companyWebsite}
                onChange={(e) => updateField("companyWebsite", e.target.value)}
                className="md:col-span-2"
              />
              <InputField
                label="Company Address"
                value={form.companyAddress}
                onChange={(e) => updateField("companyAddress", e.target.value)}
                className="md:col-span-2"
              />
            </div>
          </div>
        )}

        {/* INVOICE DETAILS SECTION */}
        {activeSection === "invoice" && (
          <div className="space-y-6">
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <h3 className="text-lg font-semibold text-gray-900">Invoice Settings</h3>
              <p className="text-sm text-gray-600 mt-1">Configure details that appear on generated invoices</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                💡 These details will automatically appear on all generated PDF invoices sent to customers
              </p>
            </div>

            {/* Company Info */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Company Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="Company Name"
                  value={form.invoiceCompanyName}
                  onChange={(e) => updateField("invoiceCompanyName", e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Company Logo
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {/* Upload from machine */}
                      <label className="flex-1 flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 transition-colors bg-gray-50/50">
                        <Upload className="w-4 h-4 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">Upload from machine</span>
                        <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="hidden" />
                      </label>
                      {/* Pick from directory */}
                      <button
                        type="button"
                        onClick={() => setShowLogoPicker(!showLogoPicker)}
                        className="flex-1 flex flex-col items-center justify-center py-6 border-2 border-dashed border-green-300 rounded-xl cursor-pointer hover:border-green-400 transition-colors bg-green-50/50"
                      >
                        <Plus className="w-4 h-4 text-green-600 mb-1" />
                        <span className="text-xs text-green-700 font-medium">Pick from directory</span>
                      </button>
                    </div>

                    {/* Logo Preview */}
                    {logoFile && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <img src={URL.createObjectURL(logoFile)} alt="Logo preview" className="w-6 h-6 object-contain" />
                        <p className="text-xs text-blue-700 flex-1">{logoFile.name}</p>
                        <button type="button" onClick={() => setLogoFile(null)} className="p-0.5 text-gray-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {logoPath && !logoFile && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <img src={`/files/serve/${logoPath}?type=image`} alt="Logo preview" className="w-6 h-6 object-contain" />
                        <p className="text-xs text-green-700 flex-1 truncate">{logoPath}</p>
                        <button type="button" onClick={() => { setLogoPath(""); updateField("invoiceCompanyLogo", ""); }} className="p-0.5 text-gray-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Logo Picker Modal */}
                    {showLogoPicker && (
                      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[70vh] overflow-hidden flex flex-col">
                          <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">Select Logo from Directory</h3>
                            <button onClick={() => setShowLogoPicker(false)} className="p-1 text-gray-400 hover:text-gray-600">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="flex-1 overflow-auto p-4">
                            {/* Upload new image */}
                            <div className="mb-6">
                              <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-400 bg-blue-50/50">
                                <Upload className="w-5 h-5 text-blue-600 mb-2" />
                                <span className="text-sm text-blue-700 font-medium">Upload new image to directory</span>
                                <span className="text-xs text-blue-600 mt-1">Max 5MB, PNG/JPG/WebP</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLogoUpload}
                                  disabled={imageUploadLoading}
                                  className="hidden"
                                />
                              </label>
                              {imageUploadLoading && <p className="text-xs text-center text-gray-500 mt-2">Uploading...</p>}
                            </div>

                            {/* Image Grid */}
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-3">Available Images</p>
                              {serverImages.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-8">No images in directory yet</p>
                              ) : (
                                <div className="grid grid-cols-3 gap-3">
                                  {serverImages.map((img) => (
                                    <button
                                      key={img.fileName}
                                      type="button"
                                      onClick={() => selectLogoFromDirectory(img.fileName)}
                                      className="relative group"
                                    >
                                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors">
                                        <img src={`/files/serve/${img.fileName}?type=image`} alt={img.fileName} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="absolute inset-0 bg-blue-600/0 hover:bg-blue-600/20 transition-colors rounded-lg flex items-end justify-center opacity-0 hover:opacity-100">
                                        <p className="text-white text-xs font-medium mb-2 bg-black/50 px-2 py-1 rounded">Select</p>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1 truncate">{img.fileName}</p>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <InputField
                  label="Invoice Email"
                  type="email"
                  value={form.invoiceCompanyEmail}
                  onChange={(e) => updateField("invoiceCompanyEmail", e.target.value)}
                />
                <InputField
                  label="Invoice Phone"
                  value={form.invoiceCompanyPhone}
                  onChange={(e) => updateField("invoiceCompanyPhone", e.target.value)}
                />
                <InputField
                  label="Company Address"
                  value={form.invoiceCompanyAddress}
                  onChange={(e) => updateField("invoiceCompanyAddress", e.target.value)}
                  className="md:col-span-2"
                />
              </div>
            </div>

            {/* Tax & Bank Info */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Tax & Bank Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="GST Number"
                  value={form.invoiceGSTNumber}
                  onChange={(e) => updateField("invoiceGSTNumber", e.target.value)}
                  placeholder="e.g., 27AABCT1234A1Z5"
                />
                <InputField
                  label="PAN Number"
                  value={form.invoicePAN}
                  onChange={(e) => updateField("invoicePAN", e.target.value)}
                  placeholder="e.g., AAABCT1234A"
                />
                <InputField
                  label="Bank Name"
                  value={form.invoiceBankName}
                  onChange={(e) => updateField("invoiceBankName", e.target.value)}
                />
                <InputField
                  label="Bank Account Number"
                  value={form.invoiceBankAccountNumber}
                  onChange={(e) => updateField("invoiceBankAccountNumber", e.target.value)}
                />
                <InputField
                  label="Bank IFSC Code"
                  value={form.invoiceBankIFSC}
                  onChange={(e) => updateField("invoiceBankIFSC", e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Invoice Footer Text
              </label>
              <textarea
                value={form.invoiceFooterText}
                onChange={(e) => updateField("invoiceFooterText", e.target.value)}
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">This text will appear at the bottom of invoices</p>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      {(activeSection === "company" || activeSection === "invoice") && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function InputField({ label, type = "text", value, onChange, placeholder = "", className = "", maxLength = null }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-900 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
    </div>
  );
}

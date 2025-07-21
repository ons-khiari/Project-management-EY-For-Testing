"use client";

import type React from "react";

import { useState, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Info,
} from "lucide-react";
import { importProjectExcel } from "@/services/project-api";

interface CompactExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CompactExcelImportModal({
  isOpen,
  onClose,
  onSuccess,
}: CompactExcelImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadStatus("error");
      setUploadMessage("Please select a valid Excel file (.xlsx or .xls)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus("error");
      setUploadMessage("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    setUploadStatus("idle");
    setUploadMessage("");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus("idle");

    try {
      const result = await importProjectExcel(selectedFile);

      if (result.success) {
        setUploadStatus("success");
        setUploadMessage(
          "Project imported successfully! All phases, deliverables, tasks, and subtasks have been created."
        );
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } else {
        setUploadStatus("error");
        setUploadMessage(
          result.message ||
            "Import failed. Please check your file format and try again."
        );
      }
    } catch (error) {
      setUploadStatus("error");
      setUploadMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadStatus("idle");
    setUploadMessage("");
    setDragActive(false);
    onClose();
  };

  const downloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/full-hierarchy-project-template.xlsx";
    link.download = "full-hierarchy-project-template.xlsx";
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Import Project from Excel
              </h3>
              <p className="text-sm text-gray-500">
                Upload an Excel file to create a complete project structure
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Horizontal Layout Content */}
        <div className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Template & Info */}
            <div className="space-y-4">
              {/* Template Download Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-blue-900 mb-1">
                      Need a template?
                    </h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Download our Excel template with the required format for
                      importing projects.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Template
                    </button>
                  </div>
                </div>
              </div>

              {/* File Requirements & Information */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 text-sm mb-2">
                      File Requirements:
                    </h5>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Excel format (.xlsx or .xls)</li>
                      <li>• Maximum file size: 10MB</li>
                      <li>• Must follow the template structure</li>
                      <li>
                        • Include phases, deliverables, tasks, subtasks and
                        comments
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <h5 className="font-medium text-gray-900 text-sm mb-2">
                    What will be created:
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Project</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Deliverable phases</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Deliverables</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Tasks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Subtasks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Comments</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Upload Area */}
            <div className="space-y-4">
              {/* Upload Area */}
              <div
                className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer min-h-[200px] flex flex-col justify-center ${
                  dragActive
                    ? "border-blue-400 bg-blue-50"
                    : selectedFile
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-3">
                    <FileSpreadsheet className="w-12 h-12 text-green-600 mx-auto" />
                    <div>
                      <p className="font-medium text-gray-900 truncate px-2">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Choose different file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="font-medium text-gray-900 text-lg">
                        Drop your Excel file here
                      </p>
                      <p className="text-gray-500">or click to browse</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Message */}
              {uploadMessage && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    uploadStatus === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : uploadStatus === "error"
                      ? "bg-red-50 text-red-800 border border-red-200"
                      : "bg-blue-50 text-blue-800 border border-blue-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {uploadStatus === "success" && (
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    )}
                    {uploadStatus === "error" && (
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="flex-1">{uploadMessage}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 h-10 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={
                    !selectedFile || isUploading || uploadStatus === "success"
                  }
                  className="flex-1 h-10 bg-[#ffe500] hover:bg-[#f5dc00] disabled:bg-gray-200 text-[#444444] disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Import Project</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

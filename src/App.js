import React, { useRef, useState, useCallback } from "react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { HexColorPicker, RgbaStringColorPicker } from "react-colorful";
import { Upload, Download, Image as ImageIcon, Palette, FileImage, CheckCircle2 } from "lucide-react";
import IcoEndec from "ico-endec";

import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Checkbox } from "./components/ui/checkbox";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";

const AVAILABLE_SIZES = [16, 32, 48, 64, 96, 128, 256, 512, 1024];

function App() {
  const [image, setImage] = useState(null);
  const cropperRef = useRef(null);
  const [backgroundColor, setBackgroundColor] = useState("transparent");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [colorPickerType, setColorPickerType] = useState("hex");
  const [hexInput, setHexInput] = useState("#ffffff");

  // Size selection state
  const [selectedSizes, setSelectedSizes] = useState([16, 32, 48, 64, 128, 256, 512]);

  // ICO file generation option
  const [generateIco, setGenerateIco] = useState(false);

  const handleColorChange = useCallback((color) => {
    setBackgroundColor(color);
    setHexInput(color);
  }, []);

  const handleHexInputChange = (e) => {
    const hex = e.target.value;
    setHexInput(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setBackgroundColor(hex);
    }
  };

  const handleRgbInputChange = (e, index) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 255) {
      const rgbArray = backgroundColor.match(/\d+/g).map(Number);
      rgbArray[index] = value;
      setBackgroundColor(`rgb(${rgbArray.join(", ")})`);
    }
  };

  const toggleSize = (size) => {
    setSelectedSizes(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size].sort((a, b) => a - b)
    );
  };

  const selectAllSizes = () => {
    setSelectedSizes([...AVAILABLE_SIZES]);
  };

  const deselectAllSizes = () => {
    setSelectedSizes([]);
  };

  // Handle image upload
  const onImageChange = (e) => {
    e.preventDefault();
    let files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;

        // For SVG files, we need to convert to high-res PNG first for better quality
        if (file.type === 'image/svg+xml') {
          const img = new Image();
          img.onload = () => {
            // Render SVG at 4x the largest size for maximum quality
            const maxSize = 4096;
            const canvas = document.createElement('canvas');
            canvas.width = maxSize;
            canvas.height = maxSize;
            const ctx = canvas.getContext('2d');

            // Calculate scaling to fit SVG in canvas
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            const x = (maxSize - img.width * scale) / 2;
            const y = (maxSize - img.height * scale) / 2;

            // Use high-quality rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

            // Convert to PNG and use that as the image source
            setImage(canvas.toDataURL('image/png'));
          };
          img.src = result;
        } else {
          setImage(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate canvas for a specific size
  const generateCanvas = async (img, size) => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = size;
    tempCanvas.height = size;
    const ctx = tempCanvas.getContext("2d");

    // Apply background color
    if (backgroundColor !== "transparent") {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    }

    // Calculate the scaling and positioning to maintain aspect ratio
    const scale = Math.min(size / img.width, size / img.height);
    const x = (size - img.width * scale) / 2;
    const y = (size - img.height * scale) / 2;

    // Use better quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

    return tempCanvas;
  };

  // Handle crop and generate files for download
  const onCropAndDownload = async () => {
    if (selectedSizes.length === 0) {
      alert("Please select at least one size!");
      return;
    }

    const cropper = cropperRef.current.cropper;
    const croppedCanvas = cropper.getCroppedCanvas();

    if (croppedCanvas) {
      const zip = new JSZip();

      // Get the original cropped image data
      const originalImageData = croppedCanvas.toDataURL("image/png");
      const img = new Image();
      img.src = originalImageData;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Generate PNG files for each selected size
      for (let size of selectedSizes) {
        const canvas = await generateCanvas(img, size);
        const dataUrl = canvas.toDataURL("image/png");
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        zip.file(`icon_${size}x${size}.png`, base64Data, { base64: true });
      }

      // Optionally generate ICO file (favicon)
      if (generateIco) {
        const icoImages = [];

        for (let size of selectedSizes) {
          const canvas = await generateCanvas(img, size);
          const dataUrl = canvas.toDataURL("image/png");
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
          const binary = atob(base64Data);
          const array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
          }
          icoImages.push({ width: size, height: size, data: array });
        }

        // Use ico-endec to create ICO file
        try {
          const icoData = IcoEndec.encode(icoImages);
          zip.file("favicon.ico", icoData);
        } catch (error) {
          console.error("Error generating ICO:", error);
          // Fallback: just add the largest size as ICO
          const size = Math.max(...selectedSizes);
          const canvas = await generateCanvas(img, size);
          const dataUrl = canvas.toDataURL("image/png");
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
          zip.file("favicon.ico", base64Data, { base64: true });
        }
      }

      zip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, "icons.zip");
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-blue-950 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Logo Icon Generator
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">Create multi-size icons & favicons instantly</p>
              </div>
            </div>
            <a
              href="https://mytasm.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Part of</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">MyTasm.com</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section - What it does */}
        {!image && (
          <div className="mb-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Convert Your Logo to Multiple Icon Sizes
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-6">
              Free online tool to generate icons in 9 different sizes (16px to 1024px) and create favicon.ico files for your website.
              Perfect for web developers, designers, and businesses.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-8 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <FileImage className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">9 Icon Sizes</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate icons from 16×16 to 1024×1024 pixels in one click
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="bg-purple-100 dark:bg-purple-900 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Palette className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Custom Colors</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Set custom background colors or keep transparency
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="bg-green-100 dark:bg-green-900 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Favicon Ready</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate favicon.ico files with multiple resolutions
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload & Cropper */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-xl border-gray-200/50 dark:border-gray-800/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-500" />
                  Upload & Crop Your Logo
                </CardTitle>
                <CardDescription>
                  Upload an image and crop it to create perfect square icons
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Button */}
                {!image && (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-12 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                    <Upload className="h-16 w-16 text-gray-400 mb-4" />
                    <Button asChild size="lg">
                      <label className="cursor-pointer flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        <span>Choose Image</span>
                        <input
                          type="file"
                          accept="image/*,image/svg+xml"
                          onChange={onImageChange}
                          className="hidden"
                        />
                      </label>
                    </Button>
                    <p className="text-sm text-gray-500 mt-4">PNG, JPG, WebP, SVG or GIF (max 10MB)</p>
                  </div>
                )}

                {/* Cropper */}
                {image && (
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <Cropper
                        src={image}
                        style={{ height: 500, width: "100%" }}
                        initialAspectRatio={1}
                        guides={true}
                        cropBoxResizable={false}
                        aspectRatio={1}
                        viewMode={2}
                        background={false}
                        responsive={true}
                        ref={cropperRef}
                      />
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setImage(null)}
                      className="w-full"
                    >
                      Change Image
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Background Color Card */}
            {image && (
              <Card className="shadow-xl border-gray-200/50 dark:border-gray-800/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-purple-500" />
                    Background Color
                  </CardTitle>
                  <CardDescription>
                    Set background color for transparent areas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Transparent Checkbox */}
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <Checkbox
                      id="transparent"
                      checked={backgroundColor === "transparent"}
                      onCheckedChange={(checked) => {
                        setBackgroundColor(checked ? "transparent" : "#ffffff");
                        setIsColorPickerOpen(false);
                      }}
                    />
                    <Label htmlFor="transparent" className="text-base cursor-pointer flex-1">
                      Transparent Background
                    </Label>
                    {backgroundColor === "transparent" && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>

                  {/* Color Picker */}
                  {backgroundColor !== "transparent" && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                        <PopoverTrigger>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-20 h-20 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-md hover:shadow-lg"
                              style={{
                                backgroundColor: backgroundColor,
                              }}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Current Color
                              </p>
                              <p className="text-xs font-mono text-gray-500">
                                {backgroundColor.toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-72">
                          <div className="space-y-4">
                            {/* Color Picker */}
                            <div className="flex justify-center">
                              {colorPickerType === "hex" ? (
                                <HexColorPicker color={backgroundColor} onChange={handleColorChange} />
                              ) : (
                                <RgbaStringColorPicker color={backgroundColor} onChange={handleColorChange} />
                              )}
                            </div>

                            {/* Switch Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setColorPickerType(colorPickerType === "hex" ? "rgb" : "hex");
                                if (colorPickerType === "rgb") {
                                  setHexInput(backgroundColor);
                                }
                              }}
                            >
                              Switch to {colorPickerType === "hex" ? "RGB" : "HEX"}
                            </Button>

                            {/* Input Fields */}
                            {colorPickerType === "hex" ? (
                              <div className="space-y-2">
                                <Label htmlFor="hex-input">Hex Color</Label>
                                <Input
                                  id="hex-input"
                                  value={hexInput}
                                  onChange={handleHexInputChange}
                                  placeholder="#ffffff"
                                />
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-2">
                                {["R", "G", "B"].map((label, index) => (
                                  <div key={label} className="space-y-2">
                                    <Label htmlFor={`rgb-${label}`}>{label}</Label>
                                    <Input
                                      id={`rgb-${label}`}
                                      type="number"
                                      min="0"
                                      max="255"
                                      value={backgroundColor.match(/\d+/g)?.[index] || 0}
                                      onChange={(e) => handleRgbInputChange(e, index)}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Size Selection & Options */}
          <div className="space-y-6">
            {/* Size Selection */}
            <Card className="shadow-xl border-gray-200/50 dark:border-gray-800/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="h-5 w-5 text-green-500" />
                  Icon Sizes
                </CardTitle>
                <CardDescription>
                  Select the sizes you want to generate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllSizes}
                    className="flex-1"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllSizes}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_SIZES.map((size) => (
                    <div
                      key={size}
                      className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedSizes.includes(size)
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() => toggleSize(size)}
                    >
                      <Checkbox
                        id={`size-${size}`}
                        checked={selectedSizes.includes(size)}
                        onCheckedChange={() => toggleSize(size)}
                      />
                      <Label
                        htmlFor={`size-${size}`}
                        className="cursor-pointer flex-1 font-medium"
                      >
                        {size}×{size}
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <strong>{selectedSizes.length}</strong> size{selectedSizes.length !== 1 ? "s" : ""} selected
                </div>
              </CardContent>
            </Card>

            {/* Favicon Generation Option */}
            <Card className="shadow-xl border-gray-200/50 dark:border-gray-800/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="h-5 w-5 text-orange-500" />
                  Favicon
                </CardTitle>
                <CardDescription>
                  Also generate favicon.ico for websites
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    generateIco
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                  onClick={() => setGenerateIco(!generateIco)}
                >
                  <Checkbox
                    id="generate-ico"
                    checked={generateIco}
                    onCheckedChange={(checked) => setGenerateIco(checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="generate-ico"
                      className="cursor-pointer font-semibold text-base"
                    >
                      Include favicon.ico
                    </Label>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Website favicon with all selected sizes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Download Button */}
            {image && (
              <Button
                onClick={onCropAndDownload}
                size="lg"
                className="w-full gap-2 shadow-lg hover:shadow-xl transition-shadow"
                disabled={selectedSizes.length === 0}
              >
                <Download className="h-5 w-5" />
                Download Icons ({selectedSizes.length} size{selectedSizes.length !== 1 ? "s" : ""}{generateIco ? " + favicon.ico" : ""})
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-8 border-t border-gray-200 dark:border-gray-800 pt-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* About */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-600" />
                Logo Icon Generator
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Free online tool to convert your logos into multiple icon sizes and generate favicon files instantly.
              </p>
              <a
                href="https://mytasm.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Visit MyTasm.com →
              </a>
            </div>

            {/* Features */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Features</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>✓ 9 icon sizes (16px - 1024px)</li>
                <li>✓ Generate favicon.ico files</li>
                <li>✓ Support PNG, JPG, SVG, WebP</li>
                <li>✓ Custom background colors</li>
                <li>✓ High-quality output</li>
                <li>✓ 100% free, no watermarks</li>
              </ul>
            </div>

            {/* Use Cases */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Perfect For</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>• Website favicons</li>
                <li>• Mobile app icons</li>
                <li>• Progressive Web Apps (PWA)</li>
                <li>• Social media profiles</li>
                <li>• Browser extensions</li>
                <li>• Desktop applications</li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} Logo Icon Generator - Part of{" "}
              <a
                href="https://mytasm.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                MyTasm.com
              </a>{" "}
              Business Tools
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              All processing happens locally in your browser. Your images are never uploaded to our servers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

import React, { useRef, useState, useCallback } from "react";
import { Container, Box, Button, Typography, AppBar, Toolbar, Checkbox, FormControlLabel, Paper, Popper } from "@mui/material";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { HexColorPicker, RgbaStringColorPicker } from "react-colorful";
import { TextField, Grid } from "@mui/material";
import { Button as MuiButton, styled } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

// Add this styled component near the top of your file, outside the App function
const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

function App() {
  const [image, setImage] = useState(null);
  const cropperRef = useRef(null);
  const [backgroundColor, setBackgroundColor] = useState("transparent");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const anchorRef = useRef(null);
  const [colorPickerType, setColorPickerType] = useState("hex");
  const [hexInput, setHexInput] = useState("#ffffff");

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

  const toggleColorPicker = () => {
    if (backgroundColor !== "transparent") {
      setIsColorPickerOpen((prev) => !prev);
    }
  };

  // Handle image upload
  const onImageChange = (e) => {
    e.preventDefault();
    let files = e.target.files;
    if (files && files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(files[0]);
    }
  };

  // Handle crop and generate zip file for download
  const onCropAndDownload = async () => {
    const cropper = cropperRef.current.cropper;
    const croppedCanvas = cropper.getCroppedCanvas();

    if (croppedCanvas) {
      const zip = new JSZip();
      const sizes = [16, 32, 48, 64, 128, 256, 512];

      // Get the original cropped image data
      const originalImageData = croppedCanvas.toDataURL("image/png");
      const img = new Image();
      img.src = originalImageData;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      for (let size of sizes) {
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

        const dataUrl = tempCanvas.toDataURL("image/png");
        const base64Data = dataUrl.replace(/^data:image\/(png|jpg);base64,/, "");
        zip.file(`icon_${size}x${size}.png`, base64Data, { base64: true });
      }

      zip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, "icons.zip");
      });
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Logo Crop and Resize Tool
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md">
        <Box my={4} display="flex" flexDirection="column" alignItems="center">
          <Typography variant="h4" gutterBottom>
            Logo Crop and Resize Tool
          </Typography>
          <MuiButton
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon />}
            sx={{ mb: 2 }}
          >
            Upload Image
            <VisuallyHiddenInput
              type="file"
              accept="image/*"
              onChange={onImageChange}
            />
          </MuiButton>
          {image && (
            <>
              <Cropper
                src={image}
                style={{ height: 400, width: "100%", maxWidth: 500 }}
                initialAspectRatio={1}
                guides={true}
                cropBoxResizable={false}
                aspectRatio={1}
                viewMode={2}
                background={false}
                responsive={true}
                ref={cropperRef}
              />
              <Box mt={2} display="flex" flexDirection="column" alignItems="center">
                <Button
                  variant="contained"
                  onClick={onCropAndDownload}
                  sx={{ mb: 2 }}
                >
                  Crop & Download Icons as Zip
                </Button>
                <Box display="flex" alignItems="center" mt={2}>
                  <Box mb={2}>
                    <Typography variant="h6">
                      Background Color Options
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      Only applicable if you have a transparent background in your image
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" mt={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={backgroundColor === "transparent"}
                        onChange={(e) => {
                          setBackgroundColor(e.target.checked ? "transparent" : "#ffffff");
                          setIsColorPickerOpen(false);
                        }}
                      />
                    }
                    label="Transparent"
                    sx={{ mr: 2 }}
                  />
                  <Box display="flex" alignItems="center">
                    <Paper
                      ref={anchorRef}
                      elevation={3}
                      sx={{
                        width: 40,

                        height: 40,
                        backgroundColor: backgroundColor === "transparent" ? "transparent" : backgroundColor,
                        border: "1px solid #ccc",
                        backgroundImage: backgroundColor === "transparent"
                          ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)"
                          : "none",
                        backgroundSize: "10px 10px",
                        mr: 2,
                        cursor: backgroundColor === "transparent" ? "default" : "pointer"
                      }}
                      onClick={toggleColorPicker}
                    />
                    <Typography>
                      {backgroundColor === "transparent" ? "Transparent" : backgroundColor.toUpperCase()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Popper open={isColorPickerOpen} anchorEl={anchorRef.current} placement="bottom-start">
                <Paper elevation={3} sx={{ p: 2, width: 250 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      {colorPickerType === "hex" ? (
                        <HexColorPicker color={backgroundColor} onChange={handleColorChange} />
                      ) : (
                        <RgbaStringColorPicker color={backgroundColor} onChange={handleColorChange} />
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setColorPickerType(colorPickerType === "hex" ? "rgb" : "hex");
                          if (colorPickerType === "rgb") {
                            setHexInput(backgroundColor);
                          }
                        }}
                      >
                        Switch to {colorPickerType === "hex" ? "RGB" : "HEX"}
                      </Button>
                    </Grid>
                    {colorPickerType === "hex" ? (
                      <Grid item xs={12}>
                        <TextField
                          label="Hex"
                          value={hexInput}
                          onChange={handleHexInputChange}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                    ) : (
                      <>
                        {["R", "G", "B"].map((label, index) => (
                          <Grid item xs={4} key={label}>
                            <TextField
                              label={label}
                              value={backgroundColor.match(/\d+/g)[index]}
                              onChange={(e) => handleRgbInputChange(e, index)}
                              fullWidth
                              size="small"
                              type="number"
                              inputProps={{ min: 0, max: 255 }}
                            />
                          </Grid>
                        ))}
                      </>
                    )}
                  </Grid>
                </Paper>
              </Popper>
            </>
          )}
        </Box>
      </Container>
    </>
  );
}

export default App;


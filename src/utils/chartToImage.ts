
/**
 * Converts an SVG element to a PNG Data URL
 * @param svgElement The SVG DOM element
 * @param width Width of the output image
 * @param height Height of the output image
 * @returns Promise resolving to base64 PNG string
 */
export const svgToPng = (svgElement: SVGSVGElement, width: number, height: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            // Clone the SVG to avoid modifying the original
            const clone = svgElement.cloneNode(true) as SVGSVGElement;

            // Set explicit width and height
            clone.setAttribute('width', width.toString());
            clone.setAttribute('height', height.toString());

            // Serialize to XML
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(clone);

            // Create a Blob and URL
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            // Create Image and Canvas
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Draw white background (optional, but good for charts)
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);

                ctx.drawImage(img, 0, 0, width, height);

                // Convert to PNG
                const pngUrl = canvas.toDataURL('image/png');

                // Cleanup
                URL.revokeObjectURL(url);
                resolve(pngUrl);
            };

            img.onerror = (e) => {
                URL.revokeObjectURL(url);
                reject(e);
            };

            img.src = url;
        } catch (error) {
            reject(error);
        }
    });
};

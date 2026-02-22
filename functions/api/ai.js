  function handleFile(file) {
            if (!file || !file.type.startsWith('image/')) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                currentImageBase64 = e.target.result.split(',')[1];
                previewImg.src = e.target.result;
                workspace.classList.remove('hidden');
                analyzeImage();
            };
            reader.readAsDataURL(file);
        }

        // --- AI Logic ---

        async function analyzeImage() {
            loading.classList.remove('hidden');
            results.classList.add('hidden');
            clearCanvas();
            
            const prompt = `Describe this image briefly. Identify the main objects and provide their normalized bounding box coordinates [ymin, xmin, ymax, xmax] as a JSON array of objects with keys: "label", "box".`;
            
            const payload = {
                contents: [{
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: "image/png", data: currentImageBase64 } }
                    ]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            description: { type: "STRING" },
                            objects: {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        label: { type: "STRING" },
                                        box: { 
                                            type: "ARRAY", 
                                            items: { type: "NUMBER" },
                                            minItems: 4,
                                            maxItems: 4
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            try {
                const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, payload);
                const data = await response.json();
                const result = JSON.parse(data.candidates[0].content.parts[0].text);
                
                displayResults(result);
            } catch (error) {
                console.error(error);
                descriptionEl.innerText = "Error contacting Gemini. Please check your connection.";
                loading.classList.add('hidden');
                results.classList.remove('hidden');
            }
        }

        async function fetchWithRetry(url, body, retries = 5, backoff = 1000) {
            for (let i = 0; i < retries; i++) {
                try {
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    if (res.ok) return res;
                    if (res.status !== 429 && res.status < 500) break;
                } catch (e) {}
                await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
            }
            throw new Error("Failed after retries");
        }

        function displayResults(data) {
            loading.classList.add('hidden');
            results.classList.remove('hidden');
            
            descriptionEl.innerText = data.description || "No description provided.";
            objectsList.innerHTML = "";

            if (data.objects && data.objects.length > 0) {
                data.objects.forEach(obj => {
                    const chip = document.createElement('div');
                    chip.className = "flex justify-between items-center p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-sm";
                    chip.innerHTML = `<span class="font-semibold text-indigo-700">${obj.label}</span>
                                      <span class="text-xs text-slate-400 font-mono">[${obj.box.join(', ')}]</span>`;
                    objectsList.appendChild(chip);
                });
                drawBoxes(data.objects);
            } else {
                objectsList.innerHTML = '<p class="text-slate-400 text-sm italic">No specific objects localized.</p>';
            }
        }

        function drawBoxes(objects) {
            const ctx = overlayCanvas.getContext('2d');
            const img = previewImg;
            
            // Wait for image dimensions to be stable
            setTimeout(() => {
                overlayCanvas.width = img.clientWidth;
                overlayCanvas.height = img.clientHeight;
                ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

                objects.forEach(obj => {
                    const [ymin, xmin, ymax, xmax] = obj.box;
                    
                    // Normalized to pixels
                    const x = (xmin / 1000) * overlayCanvas.width;
                    const y = (ymin / 1000) * overlayCanvas.height;
                    const w = ((xmax - xmin) / 1000) * overlayCanvas.width;
                    const h = ((ymax - ymin) / 1000) * overlayCanvas.height;

                    ctx.strokeStyle = '#6366f1';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(x, y, w, h);

                    ctx.fillStyle = '#6366f1';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.fillText(obj.label, x, y > 15 ? y - 5 : y + 15);
                });
            }, 100);
        }

        function clearCanvas() {
            const ctx = overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        }

        window.addEventListener('resize', () => {
            // Re-draw boxes if there's an image
            if (previewImg.src) {
                // Logic would need to cache last objects to redraw properly
            }
        });

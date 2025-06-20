function loadLibrary(urls) {
    const tryLoad = async (index = 0) => {
        if (index >= urls.length) {
            throw new Error(`Failed to load from all sources: ${urls.join(', ')}`);
        }
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = urls[index];
            script.onload = resolve;
            script.onerror = () => {
                console.warn(`Failed to load ${urls[index]}. Trying next source...`);
                tryLoad(index + 1).then(resolve).catch(reject);
            };
            document.head.appendChild(script);
        });
    };
    return tryLoad();
}

function loadLibraries() {
    const libraries = [
        {
            name: 'JSZip',
            urls: [
                'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
                'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'
            ],
            required: false
        },
        {
            name: 'mammoth',
            urls: [
                'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js',
                'https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js'
            ],
            required: false
        },
        {
            name: 'markdown-it',
            urls: [
                'https://cdnjs.cloudflare.com/ajax/libs/markdown-it/14.1.0/markdown-it.min.js',
                'https://unpkg.com/markdown-it@14.1.0/dist/markdown-it.min.js'
            ],
            required: false
        }
    ];
    return Promise.allSettled(libraries.map(lib => loadLibrary(lib.urls).then(() => lib)))
        .then(results => {
            const failed = results
                .filter(r => r.status === 'rejected')
                .map(r => `Failed to load ${r.reason.message}`);
            const loaded = results
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value.name);
            return { failed, loaded, libraries };
        });
}

function openDocument() {
    loadLibraries().then(({ failed, loaded, libraries }) => {
        let message = '';
        if (failed.length > 0) {
            message = `Some libraries failed to load: ${failed.join(', ')}. `;
        }
        if (loaded.length > 0) {
            message += `Loaded libraries: ${loaded.join(', ')}. `;
        }
        message += 'Basic file support for .txt and .md is available.';
        console.log(message);
        alert(message);
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.md,.txt,.docx,.doc,.pdf,.odt';
            input.onchange = (event) => {
                const file = event.target.files[0];
                if (!file) return;

                processFile(file, libraries).then(({ content, title }) => {
                    const docId = Date.now().toString();
                    localStorage.setItem(`doc_${docId}`, content);
                    localStorage.setItem(`title_${docId}`, title);
                    navigateToEditor(docId);
                }).catch(error => {
                    console.error('Error processing file:', error);
                    alert('Failed to process file: ' + error.message);
                });
            };
            input.click();
        } catch (error) {
            console.error('Error opening document:', error);
            alert('Failed to open document. Please try again.');
        }
    }).catch(error => {
        console.error('Critical error loading libraries:', error);
        alert('Critical error loading libraries. Please check your internet connection and try again.');
    });
}

async function processFile(file, libraries) {
    try {
        const extension = file.name.split('.').pop().toLowerCase();
        let content = '<p>Unable to parse file content.</p>';
        const title = file.name.split('.')[0];

        const isLibraryLoaded = name => libraries.some(lib => lib.name === name && libraries.find(l => l.name === name).loaded);

        if (extension === 'md') {
            if (isLibraryLoaded('markdown-it') && typeof MarkdownIt !== 'undefined') {
                const md = new MarkdownIt();
                content = md.render(await file.text());
            } else {
                content = simpleMarkdownToHtml(await file.text());
            }
        } else if (extension === 'txt') {
            const text = await file.text();
            content = `<p>${text.replace(/\n/g, '</p><p>')}</p>`;
        } else if (extension === 'docx') {
            if (isLibraryLoaded('mammoth') && typeof mammoth !== 'undefined') {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                content = result.value || '<p>Unable to extract DOCX content.</p>';
            } else {
                alert('DOCX parsing requires the mammoth library, which failed to load. Displaying raw text.');
                const text = await file.text();
                content = `<p>${text.replace(/[^\x20-\x7E\n]/g, '').replace(/\n/g, '</p><p>')}</p>`;
            }
        } else if (extension === 'odt') {
            if (isLibraryLoaded('JSZip') && typeof JSZip !== 'undefined') {
                const arrayBuffer = await file.arrayBuffer();
                const zip = await JSZip.loadAsync(arrayBuffer);
                const contentXml = await zip.file('content.xml')?.async('string');
                if (contentXml) {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(contentXml, 'text/xml');
                    const paragraphs = xmlDoc.getElementsByTagName('text:p');
                    const textContent = Array.from(paragraphs)
                        .map(p => p.textContent)
                        .filter(text => text.trim())
                        .join('</p><p>');
                    content = `<p>${textContent}</p>`;
                } else {
                    content = '<p>Unable to extract ODT content.</p>';
                }
            } else {
                alert('ODT parsing requires the JSZip library, which failed to load. Displaying raw text.');
                const text = await file.text();
                content = `<p>${text.replace(/[^\x20-\x7E\n]/g, '').replace(/\n/g, '</p><p>')}</p>`;
            }
        } else if (extension === 'doc' || extension === 'pdf') {
            alert(`${extension.toUpperCase()} files are not fully supported. Displaying raw text.`);
            const text = await file.text();
            content = `<p>${text.replace(/[^\x20-\x7E\n]/g, '').replace(/\n/g, '</p><p>')}</p>`;
        }

        content = content.replace(/<p>\s*<\/p>/g, '');
        if (!content) {
            content = '<p>Empty or unreadable file content.</p>';
        }
        return { content, title };
    } catch (error) {
        throw new Error(`Error processing ${file.name}: ${error.message}`);
    }
}

function simpleMarkdownToHtml(markdown) {
    try {
        return markdown
            .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
            .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
            .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
            .replace(/^#### (.*?)$/gm, '<h4>$1</h4>')
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>')
            .replace(/__(.*?)__/g, '<u>$1</u>')
            .replace(/^- (.*?)$/gm, '<ul><li>$1</li></ul>')
            .replace(/^\d+\. (.*?)$/gm, '<ol><li>$1</li></ol>')
            .replace(/\n\n/g, '<p></p>')
            .replace(/\n/g, '<br>')
            .replace(/<p>\s*<\/p>/g, '');
    } catch (error) {
        console.error('Error converting Markdown to HTML:', error);
        return '<p>Error parsing Markdown content.</p>';
    }
}

function navigateToEditor(docId) {
    try {
        const url = new URL('editor.html', window.location.origin);
        url.searchParams.set('id', docId);
        window.location.assign(url.toString());
    } catch (error) {
        console.error('Error navigating to editor:', error);
        alert('Failed to open editor. Please ensure editor.html exists.');
    }
}
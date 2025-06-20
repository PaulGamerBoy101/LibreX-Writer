function loadLibrary(localPath) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = localPath;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${localPath}`));
        document.head.appendChild(script);
    });
}

function loadLibraries() {
    const libraries = [
        {
            name: 'JSZip',
            path: 'jszip.min.js',
            required: false
        },
        {
            name: 'mammoth',
            path: 'mammoth.browser.min.js',
            required: false
        },
        {
            name: 'markdown-it',
            path: 'markdown-it.min.js',
            required: false
        }
    ];

    return Promise.allSettled(
        libraries.map(lib =>
            loadLibrary(lib.path)
                .then(() => {
                    lib.loaded = true;
                    return lib;
                })
                .catch(error => {
                    lib.loaded = false;
                    return Promise.reject({ error, lib });
                })
        )
    ).then(results => {
        const failed = results
            .filter(r => r.status === 'rejected')
            .map(r => `Failed to load ${r.reason.lib.name}: ${r.reason.error.message}`);
        const loaded = results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value.name);
        return { failed, loaded, libraries };
    });
}

function isLibraryLoaded(name, libraries) {
    return libraries.some(lib => lib.name === name && lib.loaded);
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
        alert('Critical error loading libraries. Please check your setup and try again.');
    });
}

async function processFile(file, libraries) {
    try {
        const extension = file.name.split('.').pop().toLowerCase();
        let content = '<p>Unable to parse file content.</p>';
        const title = file.name.split('.')[0];

        if (extension === 'md') {
            if (isLibraryLoaded('markdown-it', libraries) && typeof MarkdownIt !== 'undefined') {
                const md = new MarkdownIt();
                content = md.render(await file.text());
            } else {
                content = simpleMarkdownToHtml(await file.text());
            }
        } else if (extension === 'txt') {
            const text = await file.text();
            content = `<p>${text.replace(/\n/g, '</p><p>')}</p>`;
        } else if (extension === 'docx') {
            if (isLibraryLoaded('mammoth', libraries) && typeof mammoth !== 'undefined') {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                content = result.value || '<p>Unable to extract DOCX content.</p>';
            } else {
                alert('DOCX parsing requires the mammoth library, which failed to load. Displaying raw text.');
                const text = await file.text();
                content = `<p>${text.replace(/[^\x20-\x7E\n]/g, '').replace(/\n/g, '</p><p>')}</p>`;
            }
        } else if (extension === 'odt') {
            if (isLibraryLoaded('JSZip', libraries) && typeof JSZip !== 'undefined') {
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

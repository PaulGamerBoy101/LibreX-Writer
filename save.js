function saveDocument() {
    try {
        if (!currentDocId) {
            alert('No document ID found. Please try again.');
            return;
        }
        const content = document.getElementById('editor-content').innerHTML; // Use innerHTML to preserve formatting
        const title = document.getElementById('doc-title').value || 'Untitled Document';
        localStorage.setItem(`doc_${currentDocId}`, content);
        localStorage.setItem(`title_${currentDocId}`, title);

        // Prompt user to select format
        const format = prompt('Select download format (docx, doc, pdf, odt, md):', 'docx');
        if (format && ['docx', 'doc', 'pdf', 'odt', 'md'].includes(format.toLowerCase())) {
            saveAs(format.toLowerCase());
        } else {
            alert('Invalid format selected. Please choose docx, doc, pdf, odt, or md.');
        }
    } catch (error) {
        console.error('Error saving document:', error);
        alert('Failed to save document. Please try again.');
    }
}

function saveAs(format) {
    try {
        if (!currentDocId) return;
        const content = document.getElementById('editor-content').innerHTML; // Use innerHTML to preserve formatting
        const title = document.getElementById('doc-title').value || `Document_${currentDocId}`;
        let mimeType;
        let extension;
        let outputContent = content;

        // Basic HTML-to-Markdown conversion for md format
        if (format === 'md') {
            outputContent = simpleHtmlToMarkdown(content);
        }

        switch (format) {
            case 'docx':
                mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                extension = 'docx';
                break;
            case 'doc':
                mimeType = 'application/msword';
                extension = 'doc';
                break;
            case 'pdf':
                mimeType = 'text/plain'; // Fallback to text, as native PDF generation is not possible
                extension = 'txt';
                break;
            case 'odt':
                mimeType = 'application/vnd.oasis.opendocument.text';
                extension = 'odt';
                break;
            case 'md':
                mimeType = 'text/markdown';
                extension = 'md';
                break;
            default:
                throw new Error('Unsupported format');
        }

        const blob = new Blob([outputContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error saving as:', error);
        alert('Failed to save document in the selected format. Please try again.');
    }
}

function simpleHtmlToMarkdown(html) {
    // Basic HTML-to-Markdown conversion without external libraries
    let markdown = html
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<u[^>]*>(.*?)<\/u>/gi, '__$1__')
        .replace(/<ol[^>]*>(.*?)<\/ol>/gi, (match, p1) => {
            let items = p1.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
            return items.map((item, index) => `${index + 1}. ${item.replace(/<li[^>]*>(.*?)<\/li>/i, '$1')}`).join('\n') + '\n\n';
        })
        .replace(/<ul[^>]*>(.*?)<\/ul>/gi, (match, p1) => {
            let items = p1.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
            return items.map(item => `- ${item.replace(/<li[^>]*>(.*?)<\/li>/i, '$1')}`).join('\n') + '\n\n';
        })
        .replace(/<[^>]+>/g, '') // Remove remaining HTML tags
        .replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines
    return markdown.trim();
}
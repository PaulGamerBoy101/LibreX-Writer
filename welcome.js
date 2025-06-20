function createNewDocument() {
    try {
        const docId = Date.now().toString();
        localStorage.setItem(`doc_${docId}`, '<p>Untitled Document</p>');
        localStorage.setItem(`title_${docId}`, 'Untitled Document');
        navigateToEditor(docId);
    } catch (error) {
        console.error('Error creating new document:', error);
        alert('Failed to create new document. Please try again.');
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

document.addEventListener('DOMContentLoaded', () => {
    try {
        const recentDocs = document.getElementById('recent-documents');
        if (recentDocs) {
            recentDocs.innerHTML = '';
            const docKeys = Object.keys(localStorage).filter(key => key.startsWith('doc_')).sort();
            for (const key of docKeys) {
                const docId = key.replace('doc_', '');
                const title = localStorage.getItem(`title_${docId}`) || `Document ${docId}`;
                const docCard = document.createElement('div');
                docCard.textContent = title;
                docCard.style.cursor = 'pointer';
                docCard.style.padding = '8px';
                docCard.style.border = '1px solid #ccc';
                docCard.style.marginBottom = '4px';
                docCard.onclick = () => navigateToEditor(docId);
                recentDocs.appendChild(docCard);
            }
        }
    } catch (error) {
        console.error('Error loading recent documents:', error);
        alert('Failed to load recent documents. Please try again.');
    }
});
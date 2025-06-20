let currentDocId = new URLSearchParams(window.location.search).get('id');

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (currentDocId) {
            const content = localStorage.getItem(`doc_${currentDocId}`) || '<p>Untitled Document</p>';
            const title = localStorage.getItem(`title_${currentDocId}`) || 'Untitled Document';
            document.getElementById('editor-content').innerHTML = content;
            document.getElementById('doc-title').value = title;
            updateButtonStates();
        } else {
            console.error('No document ID provided');
            alert('Error: No document selected. Returning to welcome screen.');
            window.location.href = 'index.html';
        }
        document.getElementById('editor-content').addEventListener('keyup', updateButtonStates);
        document.getElementById('editor-content').addEventListener('click', updateButtonStates);
        document.getElementById('doc-title').addEventListener('change', saveDocument);
    } catch (error) {
        console.error('Error loading document:', error);
        alert('Failed to load document. Returning to welcome screen.');
        window.location.href = 'index.html';
    }
});

function updateButtonStates() {
    document.getElementById('bold-btn').classList.toggle('active', document.queryCommandState('bold'));
    document.getElementById('italic-btn').classList.toggle('active', document.queryCommandState('italic'));
    document.getElementById('underline-btn').classList.toggle('active', document.queryCommandState('underline'));
    document.getElementById('ordered-list-btn').classList.toggle('active', document.queryCommandState('insertOrderedList'));
    document.getElementById('unordered-list-btn').classList.toggle('active', document.queryCommandState('insertUnorderedList'));
    document.getElementById('justify-left-btn').classList.toggle('active', document.queryCommandState('justifyLeft'));
    document.getElementById('justify-center-btn').classList.toggle('active', document.queryCommandState('justifyCenter'));
    document.getElementById('justify-right-btn').classList.toggle('active', document.queryCommandState('justifyRight'));
    document.getElementById('justify-full-btn').classList.toggle('active', document.queryCommandState('justifyFull'));
}

function formatText(command, value = null) {
    try {
        if (command === 'style') {
            const [tag, styleName] = value.split('|');
            if (tag) {
                document.execCommand('formatBlock', false, tag);
            }
        } else if (command === 'insertOrderedList' && value === 'lower-alpha') {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const ol = document.createElement('ol');
                ol.style.listStyleType = 'lower-alpha';
                const li = document.createElement('li');
                ol.appendChild(li);
                range.deleteContents();
                range.insertNode(ol);
                selection.removeAllRanges();
                const newRange = document.createRange();
                newRange.selectNodeContents(li);
                selection.addRange(newRange);
            }
        } else if (command === 'insertOrderedList') {
            document.execCommand('insertOrderedList', false, null);
            const ol = document.querySelector('ol:not([style])');
            if (ol) ol.style.listStyleType = 'decimal';
        } else if (command === 'insertUnorderedList') {
            document.execCommand('insertUnorderedList', false, null);
            const ul = document.querySelector('ul:not([style])');
            if (ul) ul.style.listStyleType = 'disc';
        } else {
            document.execCommand(command, false, value);
        }
        document.getElementById('editor-content').focus();
        updateButtonStates();
    } catch (error) {
        console.error('Error formatting text:', error);
        alert('Failed to apply formatting. Please try again.');
    }
}
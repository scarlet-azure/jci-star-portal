export function initSubmission() {
    const form = document.getElementById('submission-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                title: document.getElementById('sub-title').value,
                category: document.getElementById('sub-category').value,
                description: document.getElementById('sub-desc').value
            };

            try {
                const response = await fetch('/api/submissions/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    alert('Submission berhasil dibuat!');
                    form.reset();
                } else {
                    const err = await response.json();
                    alert(`Gagal: ${err.detail}`);
                }
            } catch (error) {
                console.error('Error submitting form:', error);
            }
        });
    }
}
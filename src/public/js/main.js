// WanzOFC Site Builder Client-Side JavaScript

// Inisialisasi Tooltip Bootstrap (jika digunakan)
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
 var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl)
 })

// Contoh: Konfirmasi sebelum delete
document.addEventListener('DOMContentLoaded', function() {
    const deleteForms = document.querySelectorAll('form.delete-confirm');
    deleteForms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                event.preventDefault();
            }
        });
    });

    // Pretty print JSON di textarea (jika ada dan ingin)
    const jsonTextarea = document.getElementById('pageStructureJson');
    if (jsonTextarea) {
        try {
            const currentJson = JSON.parse(jsonTextarea.value);
            jsonTextarea.value = JSON.stringify(currentJson, null, 2);
        } catch (e) {
            console.warn("Could not auto-format JSON in textarea, it might be invalid.", e);
        }
    }
});

// Anda bisa menambahkan lebih banyak interaktivitas di sini
// Misalnya, untuk editor visual (ini akan sangat kompleks)
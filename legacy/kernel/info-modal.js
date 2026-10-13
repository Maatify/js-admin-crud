window.showInfoModal = function (title, content, icon) {
    icon = icon || 'ℹ️';
    var modalId = 'info-modal-' + Date.now();
    var html = window.AdminUIComponents.buildModalTemplate({
        id: modalId,
        title: title,
        icon: icon,
        content: '<div class="p-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">' + content + '</div>',
        size: 'xl'
    });
    document.body.insertAdjacentHTML('beforeend', html);
    var modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.querySelectorAll('.close-modal').forEach(function (el) {
        el.addEventListener('click', function () { modal.remove(); });
    });
    modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.remove();
    });
};

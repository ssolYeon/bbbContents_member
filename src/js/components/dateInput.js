export const dateInputChange = (e) => {
    if (!e?.target || e.target.type !== 'date') return;

    const dateInput = e.target;

    if (dateInput.value) {
        dateInput.classList.add('selected');
    } else {
        dateInput.classList.remove('selected');
    }
}
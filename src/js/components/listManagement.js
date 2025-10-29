export const listManagement =(options)=> {
  const {
    btnSelector,
    templateId,
    containerSelector,
    switchPrefix = "switch",
  } = options;

  const $addBtn = document.querySelector(btnSelector);
  const $container = document.querySelector(containerSelector);
  const $template = document.getElementById(templateId);

  if (!$addBtn || !$container || !$template) return;

  $addBtn.addEventListener("click", () => {
    const $clone = $template.content.firstElementChild.cloneNode(true);
    const uniqueId = Date.now();

    const $numberEl = $clone.querySelector(".list_num");
    if ($numberEl) {
      const count = $container.children.length + 1;
      $numberEl.textContent = `설정 ${count}`;
    }

    const $switchInput = $clone.querySelector('input[type="checkbox"]');
    const $switchLabel = $clone.querySelector(
      `label[for="${$switchInput?.id}"]`
    );
    if ($switchInput && $switchLabel) {
      const newId = `${switchPrefix}_${uniqueId}`;
      $switchInput.id = newId;
      $switchLabel.setAttribute("for", newId);
    }

    $clone.querySelectorAll('input[type="radio"]').forEach(($radio) => {
      if ($radio.name) {
        $radio.name = `${$radio.name}_${uniqueId}`;
      }
    });

    $container.appendChild($clone);
  });

  $container.addEventListener("click", (e) => {
    if (e.target.closest(".del_btn")) {
      const $target = e.target.closest("li, .draggable");
      if ($target) $target.remove();
    }
  });
}

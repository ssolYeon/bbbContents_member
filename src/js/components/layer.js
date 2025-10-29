export const layerHandler = () => {
    const closeLayerHandler = () => {
        document.documentElement.classList.remove("fixed");

        const $openLayers = document.querySelectorAll('.layer_wrap[style*="display: block"]');

        $openLayers.forEach(($ly) => {
            if ($ly.style.display === "block") {
                $ly.style.display = "none";
            }
        });

        const $overlay = document.getElementById("overlay");
        if ($overlay) {
            $overlay.remove();
        }

        document.removeEventListener("click", outsideClickHandler);
    };

    const outsideClickHandler = (event) => {
        const $openLayer = document.querySelector('.layer_wrap[style*="display: block"]');
        if (!$openLayer) return;

        if (event.target.closest(".del_btn")) {
            return;
        }

        if (!$openLayer.contains(event.target) && !event.target.closest(".js_remove_btn")) {
            closeLayerHandler();
        }
    };

    document.addEventListener("click", (e) => {
        const $btn = e.target.closest(".layerOpen");

        if ($btn) {
            e.preventDefault();

            const layerName = $btn.getAttribute("data-btn");
            const $layer = document.querySelector(`.layer_wrap[data-name="${layerName}"]`);
            if (!$layer) return;

            document.documentElement.classList.add("fixed");

            let $overlay = document.getElementById("overlay");
            if (!$overlay) {
                $overlay = document.createElement("div");
                $overlay.classList.add("overlay");
                $overlay.id = "overlay";
                document.body.appendChild($overlay);
            }

            $overlay.style.display = "block";
            $layer.style.display = "block";

            $layer.addEventListener("click", (evt) => {
                if (evt.target.classList.contains("js_remove_btn")) {
                    closeLayerHandler();
                }
            });

            document.addEventListener("click", outsideClickHandler);
            return;
        }
        if (e.target.classList.contains("js_remove_btn")) {
            closeLayerHandler();
            return;
        }
    });
};

window.layerHandler = layerHandler;
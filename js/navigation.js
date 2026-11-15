/**
     * NAVEGAÇÃO DE ABAS GLOBAL RESILIENTE (Nível 0 - Execução Garantida)
     * Pode ser disparada via atributo inline `onclick="switchTab('abaX')"` ou evento JS.
     */
    function switchTab(tabId) {
      try {
        const targetPanel = document.getElementById(tabId);
        if (!targetPanel) return;

        // Esconde todos os painéis
        const allPanels = document.querySelectorAll('.tab-panel');
        allPanels.forEach(panel => {
          panel.classList.remove('active');
          panel.style.setProperty('display', 'none', 'important');
        });

        // Exibe o painel correto
        targetPanel.classList.add('active');
        targetPanel.style.setProperty('display', 'block', 'important');

        // Atualiza estado visual dos botões
        const allButtons = document.querySelectorAll('.tab-btn');
        allButtons.forEach(btn => {
          btn.classList.remove('active', 'border-terracotta', 'text-terracotta', 'bg-terracotta/10');
          btn.classList.add('border-gray-700/80', 'text-gray-300', 'bg-charcoalCard');
        });

        const selectedBtn = document.querySelector(`[data-tab="${tabId}"]`);
        if (selectedBtn) {
          selectedBtn.classList.add('active', 'border-terracotta', 'text-terracotta', 'bg-terracotta/10');
          selectedBtn.classList.remove('border-gray-700/80', 'text-gray-300', 'bg-charcoalCard');
          selectedBtn.setAttribute('aria-selected', 'true');
          if (window.matchMedia && window.matchMedia('(max-width: 640px)').matches) {
            selectedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }

        document.querySelectorAll('.tab-btn').forEach(btn => {
          if (btn !== selectedBtn) btn.setAttribute('aria-selected', 'false');
        });
        const mobileTabSelect = document.getElementById('mobile-tab-select');
        if (mobileTabSelect && mobileTabSelect.value !== tabId) mobileTabSelect.value = tabId;

        // Atualiza hash sem rolagem
        if (window.history && window.history.pushState) {
          window.history.pushState(null, null, '#' + tabId);
        } else {
          window.location.hash = '#' + tabId;
        }

        // Trigger de redimensionamento caso haja gráficos ou mapas
        window.dispatchEvent(new Event('resize'));
      } catch (err) {
        console.error('Erro ao alternar abas:', err);
      }
    }

    // Event Listener no DOMContentLoaded para suporte a hash e links
    document.addEventListener('DOMContentLoaded', function() {
      try {
        const mobileTabSelect = document.getElementById('mobile-tab-select');
        if (mobileTabSelect) {
          mobileTabSelect.addEventListener('change', () => switchTab(mobileTabSelect.value));
        }
        const hash = window.location.hash.replace('#', '');
        if (hash && document.getElementById(hash)) {
          switchTab(hash);
        } else {
          switchTab('aba1');
        }
      } catch (e) {
        switchTab('aba1');
      }
    });

// Fase 1/2: temperatura final da massa e lista completa de compras.
    (function initProductionPlanning() {
      const $ = (id) => document.getElementById(id);
      const number = (id, fallback = 0) => {
        const value = Number($(id)?.value);
        return Number.isFinite(value) ? value : fallback;
      };
      const fmt = (value, decimals = 1) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      function calculateWaterTemperature() {
        const ambient = number('temp-ambient', 22), flour = number('temp-flour', 20), friction = number('temp-friction', 3), target = number('temp-target', 24);
        const water = (target * 3) - ambient - flour - friction;
        $('temp-water-result').textContent = `${fmt(water)} °C`;
        $('temp-explanation').textContent = `Fórmula: (temperatura desejada × 3) − ambiente − farinha − atrito = (${fmt(target)} × 3) − ${fmt(ambient)} − ${fmt(flour)} − ${fmt(friction)} = ${fmt(water)} °C.`;
        return water;
      }
      function getDoughIngredients() {
        const mode = $('recipe-mode')?.value || 'ingredients', reference = $('recipe-reference')?.value || 'water', quantity = Math.max(1, number('input-qtd', 12));
        const hydration = Math.max(1, number('input-hidratacao', 55)) / 100, saltRate = Math.max(0, number('input-sal', 55)), yeastRate = Math.max(0, number('input-fermento', 0.2));
        let water;
        let flour;
        if (mode === 'cartela') {
          const doughTotal = Math.max(0, number('input-peso', 239) * quantity), flourFactor = 1 + hydration + (saltRate * hydration / 1000) + (yeastRate * hydration / 1000);
          water = (doughTotal / flourFactor) * hydration;
          flour = water / hydration;
        } else if (reference === 'flour') {
          flour = Math.max(0, number('input-farinha', 1818));
          water = flour * hydration;
        } else {
          water = Math.max(0, number('input-agua', 1000));
          flour = water / hydration;
        }
        return { water, flour, salt: water * saltRate / 1000, yeast: water * yeastRate / 1000 };
      }
      function renderCompleteShopping() {
        const dough = getDoughIngredients();
        const items = [
          ['Farinha tipo 00', `${fmt(dough.flour, 0)} g`, 'Massa'], ['Água', `${fmt(dough.water, 0)} g`, 'Massa'],
          ['Sal marinho', `${fmt(dough.salt, 1)} g`, 'Massa'], ['Fermento fresco', `${fmt(dough.yeast, 2)} g`, 'Massa'],
          ['Caixas', `${fmt(number('shopping-boxes'), 0)} un.`, 'Operação'], ['Energia elétrica', `${fmt(number('shopping-energy'), 1)} kWh`, 'Forno'],
          ['Lenha', `${fmt(number('shopping-wood'), 1)} kg`, 'Forno'], ['Gás', `${fmt(number('shopping-gas'), 1)} kg`, 'Forno']
        ];
        const target = $('complete-shopping-list');
        if (target) target.innerHTML = items.map(([name, amount, group]) => `<div class="flex items-center justify-between gap-3 bg-charcoal rounded border border-gray-800 px-3 py-2"><span><strong class="block text-xs text-cream">${name}</strong><small class="text-[10px] text-gray-500">${group}</small></span><span class="text-sm font-semibold text-blue-200">${amount}</span></div>`).join('');
      }
      ['temp-ambient', 'temp-flour', 'temp-friction', 'temp-target'].forEach((id) => $(id)?.addEventListener('input', calculateWaterTemperature));
      ['input-agua', 'input-farinha', 'input-hidratacao', 'input-sal', 'input-fermento', 'input-qtd', 'input-peso', 'recipe-mode', 'recipe-reference', 'shopping-boxes', 'shopping-energy', 'shopping-wood', 'shopping-gas'].forEach((id) => $(id)?.addEventListener('input', renderCompleteShopping));
      $('recipe-mode')?.addEventListener('change', renderCompleteShopping);
      $('recipe-reference')?.addEventListener('change', renderCompleteShopping);
      $('temp-apply-btn')?.addEventListener('click', () => { const water = Math.max(1, calculateWaterTemperature()); if ($('recipe-mode')) $('recipe-mode').value = 'ingredients'; if ($('input-agua')) $('input-agua').value = Math.round(water); if ($('slider-agua')) $('slider-agua').value = Math.round(water); $('input-agua')?.dispatchEvent(new Event('input', { bubbles: true })); renderCompleteShopping(); });
      calculateWaterTemperature(); renderCompleteShopping();
    })();

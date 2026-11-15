/* ==========================================================================
       MÓDULO 7: RELATÓRIO DE CUSTOS DE PRODUÇÃO E PRECIFICAÇÃO
       ========================================================================== */
    try {
      (function initRelatorioCustos() {
        const settingsKey = 'avpn_cost_report_settings_v1';
        const ids = ['cost-labor', 'cost-energy', 'cost-packaging', 'cost-waste', 'cost-fees', 'cost-margin'];
        const get = id => document.getElementById(id);
        const money = value => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
        const flavorNames = { margherita: 'Margherita D.O.P.', marinara: 'Marinara Classica', calzone: 'Calzone / Ripieno' };
        const doses = {
          tomate: { margherita: 75, marinara: 75, calzone: 50, price: 28 },
          mozzarella: { margherita: 90, marinara: 0, calzone: 90, price: 65 },
          evoo: { margherita: 7, marinara: 7, calzone: 5, price: 60 },
          grana: { margherita: 6, marinara: 0, calzone: 6, price: 90 },
          basilico: { margherita: 3, marinara: 2, calzone: 0, price: 40 },
          alho: { margherita: 0, marinara: 3, calzone: 0, price: 30 },
          oregano: { margherita: 0, marinara: 0.5, calzone: 0, price: 80 },
          ricota: { margherita: 0, marinara: 0, calzone: 120, price: 35 },
          salame: { margherita: 0, marinara: 0, calzone: 40, price: 85 },
          semolina: { margherita: 15, marinara: 15, calzone: 15, price: 18 }
        };
        const mixInputs = { margherita: get('mix-margherita'), marinara: get('mix-marinara'), calzone: get('mix-calzone') };
        const savedSettings = (() => { try { return JSON.parse(localStorage.getItem(settingsKey) || '{}'); } catch (error) { return {}; } })();
        ids.forEach(id => { if (savedSettings[id] !== undefined) get(id).value = savedSettings[id]; });

        function calculateCoverageCost(flavor) {
          return Object.values(doses).reduce((sum, item) => sum + ((item[flavor] || 0) / 1000) * item.price, 0);
        }

        function renderReport() {
          const labor = Math.max(0, Number(get('cost-labor').value) || 0);
          const energy = Math.max(0, Number(get('cost-energy').value) || 0);
          const packaging = Math.max(0, Number(get('cost-packaging').value) || 0);
          const waste = Math.min(50, Math.max(0, Number(get('cost-waste').value) || 0)) / 100;
          const fees = Math.min(50, Math.max(0, Number(get('cost-fees').value) || 0)) / 100;
          const margin = Math.min(80, Math.max(0, Number(get('cost-margin').value) || 0)) / 100;
          const quantities = Object.fromEntries(Object.entries(mixInputs).map(([key, el]) => [key, Math.max(0, Number(el.value) || 0)]));
          const totalPizzas = Object.values(quantities).reduce((sum, value) => sum + value, 0);
          const fixedPerPizza = totalPizzas ? (labor + energy) / totalPizzas : 0;
          const denominator = 1 - fees - margin;
          let variableTotal = 0;
          let productionTotal = 0;
          let suggestedRevenue = 0;
          let rows = '';

          Object.entries(quantities).forEach(([flavor, quantity]) => {
            const ingredientCost = calculateCoverageCost(flavor);
            const baseVariable = 3.20 + ingredientCost + packaging;
            const wasteCost = baseVariable * waste;
            const unitCost = baseVariable + wasteCost + fixedPerPizza;
            const suggestedPrice = denominator > 0 ? unitCost / denominator : unitCost;
            const flavorTotal = unitCost * quantity;
            const estimatedMargin = suggestedPrice - unitCost - (suggestedPrice * fees);
            variableTotal += (baseVariable + wasteCost) * quantity;
            productionTotal += flavorTotal;
            suggestedRevenue += suggestedPrice * quantity;
            rows += `<tr class="hover:bg-charcoal/50"><td class="p-3 text-cream font-medium">${flavorNames[flavor]}</td><td class="p-3 text-gold">${quantity}</td><td class="p-3">${money(unitCost)}</td><td class="p-3">${money(flavorTotal)}</td><td class="p-3 text-green-400 font-semibold">${money(suggestedPrice)}</td><td class="p-3 text-right text-green-300">${money(estimatedMargin)}</td></tr>`;
          });

          get('cost-report-body').innerHTML = rows;
          get('report-total-pizzas').textContent = totalPizzas;
          get('report-variable-cost').textContent = money(variableTotal);
          get('report-total-cost').textContent = money(productionTotal);
          get('report-unit-cost').textContent = money(totalPizzas ? productionTotal / totalPizzas : 0);
          get('report-average-price').textContent = money(totalPizzas ? suggestedRevenue / totalPizzas : 0);
          get('cost-report-note').textContent = `O relatório considera R$ ${labor.toFixed(2)} de mão de obra, R$ ${energy.toFixed(2)} de energia/gás/lenha, ${Number(get('cost-waste').value || 0).toFixed(1)}% de perdas, ${Number(get('cost-fees').value || 0).toFixed(1)}% de taxas e ${Number(get('cost-margin').value || 0).toFixed(1)}% de margem desejada. A massa foi estimada em R$ 3,20 por pizza; substitua esse valor na composição real quando houver custo detalhado da massa.`;
          const settings = {}; ids.forEach(id => { settings[id] = get(id).value; });
          try { localStorage.setItem(settingsKey, JSON.stringify(settings)); } catch (error) {}
        }

        [...ids.map(get), ...Object.values(mixInputs)].forEach(el => el.addEventListener('input', renderReport));
        get('cost-report-print-btn').addEventListener('click', () => window.print());
        renderReport();
      })();
    } catch (error) {
      console.error('Erro no relatório de custos:', error);
    }

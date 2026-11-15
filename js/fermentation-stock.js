/* ==========================================================================
       MÓDULO 6: FERMENTAÇÃO E ESTOQUE
       ========================================================================== */
    try {
      (function initFase2() {
        // Calculador de fermentação: estimativa prática limitada ao teto AVPN de 24h.
        const fermTemp = document.getElementById('ferm-temp');
        const fermYeast = document.getElementById('ferm-yeast');
        const fermHydration = document.getElementById('ferm-hydration');
        const fermPuntata = document.getElementById('ferm-puntata');
        const fermTotal = document.getElementById('ferm-total-result');
        const fermAppretto = document.getElementById('ferm-appretto-result');
        const fermRange = document.getElementById('ferm-range-result');
        const fermStatus = document.getElementById('ferm-status-result');
        const fermExplanation = document.getElementById('ferm-explanation');

        function calculateFermentation() {
          const temperature = Math.min(35, Math.max(10, Number(fermTemp.value) || 22));
          const yeast = Math.min(5, Math.max(0.05, Number(fermYeast.value) || 0.2));
          const hydration = Math.min(75, Math.max(50, Number(fermHydration.value) || 55));
          const puntata = Math.min(8, Math.max(0.5, Number(fermPuntata.value) || 2));
          const temperatureFactor = Math.pow(2, (22 - temperature) / 10);
          const yeastFactor = Math.sqrt(0.2 / yeast);
          const hydrationFactor = 1 + ((hydration - 55) / 100) * 0.25;
          const rawHours = 24 * temperatureFactor * yeastFactor * hydrationFactor;
          const totalHours = Math.round(Math.min(24, Math.max(4, rawHours)));
          const appretto = Math.max(0, totalHours - puntata);
          const lower = Math.max(4, totalHours - 2);
          const upper = Math.min(24, totalHours + 2);
          const status = totalHours <= 10 ? 'Rápida' : totalHours >= 22 ? 'Longa / fria' : 'Equilibrada';
          const statusClass = totalHours <= 10 ? 'text-yellow-300' : totalHours >= 22 ? 'text-blue-300' : 'text-green-400';

          fermTotal.textContent = `${totalHours}h`;
          fermAppretto.textContent = `${appretto.toFixed(1)}h`;
          fermRange.textContent = `${lower}–${upper}h`;
          fermStatus.textContent = status;
          fermStatus.className = `text-sm ${statusClass}`;
          fermExplanation.textContent = `Estimativa: ${totalHours}h totais, com aproximadamente ${appretto.toFixed(1)}h de appretto após ${puntata.toFixed(1)}h de puntata. Temperaturas mais altas e mais fermento aceleram a fermentação; hidratação maior tende a prolongá-la. O resultado deve ser validado pelo volume e pela textura da massa.`;
          return totalHours;
        }

        [fermTemp, fermYeast, fermHydration, fermPuntata].forEach(el => el.addEventListener('input', calculateFermentation));
        document.getElementById('ferm-apply-btn').addEventListener('click', () => {
          const total = calculateFermentation();
          const preparationSelect = document.getElementById('crono-preparation-hours');
          const allowed = [12, 16, 20, 24];
          const closest = allowed.reduce((best, value) => Math.abs(value - total) < Math.abs(best - total) ? value : best, allowed[0]);
          preparationSelect.value = String(closest);
          preparationSelect.dispatchEvent(new Event('change'));
          const message = document.getElementById('crono-validation-message');
          if (message) {
            message.textContent = `Tempo de preparação ajustado para ${closest}h no cronograma. Confira a massa durante a fermentação.`;
            message.classList.remove('hidden');
            message.classList.remove('text-yellow-200');
            message.classList.add('text-green-300');
          }
        });
        calculateFermentation();

        // Controle de estoque persistente no dispositivo.
        const stockKey = 'avpn_ingredient_stock_v1';
        const stockBody = document.getElementById('stock-table-body');
        const stockTotal = document.getElementById('stock-total-value');
        const stockAlert = document.getElementById('stock-low-alert');
        const stockDefaults = {
          tomate: { name: 'Tomate pelado / molho', unit: 'kg', quantity: 2, minimum: 0.5, price: 28 },
          mozzarella: { name: 'Mozzarella / Fior di Latte', unit: 'kg', quantity: 2, minimum: 0.5, price: 65 },
          evoo: { name: 'Azeite extravirgem', unit: 'L', quantity: 1, minimum: 0.25, price: 60 },
          grana: { name: 'Queijo duro ralado', unit: 'kg', quantity: 0.5, minimum: 0.1, price: 90 },
          basilico: { name: 'Manjericão fresco', unit: 'kg', quantity: 0.2, minimum: 0.05, price: 40 },
          alho: { name: 'Alho fresco laminado', unit: 'kg', quantity: 0.2, minimum: 0.05, price: 30 },
          oregano: { name: 'Orégano seco', unit: 'kg', quantity: 0.1, minimum: 0.02, price: 80 },
          ricota: { name: 'Ricota fresca', unit: 'kg', quantity: 1, minimum: 0.2, price: 35 },
          salame: { name: 'Salame napolitano', unit: 'kg', quantity: 1, minimum: 0.2, price: 85 },
          semolina: { name: 'Semolina de abertura', unit: 'kg', quantity: 2, minimum: 0.5, price: 18 }
        };
        const readStock = () => {
          try {
            const saved = JSON.parse(localStorage.getItem(stockKey) || 'null');
            return saved && typeof saved === 'object' ? saved : JSON.parse(JSON.stringify(stockDefaults));
          } catch (error) { return JSON.parse(JSON.stringify(stockDefaults)); }
        };
        const writeStock = stock => { try { localStorage.setItem(stockKey, JSON.stringify(stock)); } catch (error) {} };
        let stock = readStock();
        const stockMoney = value => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
        const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

        window.updateStockField = function(key, field, value) {
          if (!stock[key]) return;
          stock[key][field] = field === 'name' || field === 'unit' ? String(value) : Math.max(0, Number(value) || 0);
          writeStock(stock); renderStock();
        };

        function renderStock() {
          let totalValue = 0;
          const lowItems = [];
          stockBody.innerHTML = Object.entries(stock).map(([key, item]) => {
            const quantity = Number(item.quantity) || 0;
            const minimum = Number(item.minimum) || 0;
            const price = Number(item.price) || 0;
            totalValue += quantity * price;
            const isLow = quantity <= minimum;
            if (isLow) lowItems.push(item.name);
            return `<tr class="${isLow ? 'bg-red-950/20' : 'hover:bg-charcoal/50'}">
              <td class="p-2 text-cream font-medium">${escapeHtml(item.name)}</td>
              <td class="p-2 text-gray-400">${escapeHtml(item.unit)}</td>
              <td class="p-2"><input type="number" min="0" step="0.01" value="${quantity}" onchange="window.updateStockField('${key}', 'quantity', this.value)" class="w-20 bg-charcoal border border-gray-700 rounded px-2 py-1 text-right text-gold"></td>
              <td class="p-2"><input type="number" min="0" step="0.01" value="${minimum}" onchange="window.updateStockField('${key}', 'minimum', this.value)" class="w-20 bg-charcoal border border-gray-700 rounded px-2 py-1 text-right text-gray-300"></td>
              <td class="p-2"><input type="number" min="0" step="0.01" value="${price}" onchange="window.updateStockField('${key}', 'price', this.value)" class="w-24 bg-charcoal border border-gray-700 rounded px-2 py-1 text-right text-gold"></td>
              <td class="p-2"><span class="px-2 py-1 rounded text-[10px] ${isLow ? 'bg-red-900/40 text-red-300' : 'bg-avpnGreen/30 text-green-300'}">${isLow ? 'BAIXO' : 'OK'}</span></td>
              <td class="p-2 text-right"><button type="button" onclick="window.updateStockField('${key}', 'quantity', ${(quantity + 1).toFixed(2)})" class="text-xs text-gold hover:underline">+1 ${escapeHtml(item.unit)}</button></td>
            </tr>`;
          }).join('');
          stockTotal.textContent = stockMoney(totalValue);
          stockAlert.textContent = lowItems.length ? `Atenção: estoque abaixo do mínimo para ${lowItems.join(', ')}.` : 'Estoque dentro dos mínimos configurados.';
          stockAlert.className = lowItems.length ? 'text-xs text-red-300' : 'text-xs text-green-300';
        }

        document.getElementById('stock-add-btn').addEventListener('click', () => {
          const nameEl = document.getElementById('stock-new-name');
          const unitEl = document.getElementById('stock-new-unit');
          const priceEl = document.getElementById('stock-new-price');
          const name = nameEl.value.trim();
          if (!name) { nameEl.focus(); return; }
          const key = `custom_${Date.now()}`;
          stock[key] = { name, unit: unitEl.value.trim() || 'kg', quantity: 0, minimum: 0, price: Math.max(0, Number(priceEl.value) || 0) };
          writeStock(stock); renderStock(); nameEl.value = ''; priceEl.value = '0';
        });

        document.getElementById('stock-deduct-btn').addEventListener('click', () => {
          const flavor = document.getElementById('flavor-select').value;
          const quantity = Math.max(0, Number(document.getElementById('flavor-quantity').value) || 0);
          const doses = {
            tomate: { margherita: 75, marinara: 75, calzone: 50 }, mozzarella: { margherita: 90, marinara: 0, calzone: 90 },
            evoo: { margherita: 7, marinara: 7, calzone: 5 }, grana: { margherita: 6, marinara: 0, calzone: 6 },
            basilico: { margherita: 3, marinara: 2, calzone: 0 }, alho: { margherita: 0, marinara: 3, calzone: 0 },
            oregano: { margherita: 0, marinara: 0.5, calzone: 0 }, ricota: { margherita: 0, marinara: 0, calzone: 120 },
            salame: { margherita: 0, marinara: 0, calzone: 40 }, semolina: { margherita: 15, marinara: 15, calzone: 15 }
          };
          Object.entries(doses).forEach(([key, flavorDoses]) => {
            if (stock[key]) stock[key].quantity = Math.max(0, Number(stock[key].quantity || 0) - ((flavorDoses[flavor] || 0) * quantity / 1000));
          });
          writeStock(stock); renderStock();
          stockAlert.textContent = `Baixa registrada para ${quantity} unidade(s) de ${flavor}.`;
          stockAlert.className = 'text-xs text-gold';
        });
        renderStock();
      })();
    } catch (error) {
      console.error('Erro no módulo de fermentação e estoque:', error);
    }

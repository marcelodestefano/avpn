/* ==========================================================================
       MÓDULO 5: BIBLIOTECA DE RECEITAS, FICHA TÉCNICA E LISTA DE COMPRAS
       ========================================================================== */
    try {
      (function initFase1() {
        const storageKey = 'avpn_saved_recipes_v1';
        const recipeName = document.getElementById('recipe-library-name');
        const recipeSelect = document.getElementById('recipe-library-select');
        const recipeStatus = document.getElementById('recipe-library-status');
        const flavorSelect = document.getElementById('flavor-select');
        const flavorQuantity = document.getElementById('flavor-quantity');
        const flavorPrice = document.getElementById('flavor-price');
        const flavorSheetBody = document.getElementById('flavor-sheet-body');
        const shoppingBody = document.getElementById('shopping-list-body');
        const shoppingTotal = document.getElementById('shopping-list-total');
        const flavorCost = document.getElementById('flavor-sheet-cost');
        const flavorUnitCost = document.getElementById('flavor-sheet-unit-cost');
        const flavorMargin = document.getElementById('flavor-sheet-margin');

        const inputs = ['input-agua', 'input-hidratacao', 'input-sal', 'input-fermento', 'input-qtd', 'input-peso'];
        const ingredientCatalog = {
          tomate: { name: 'Tomate pelado / molho', unit: 'g', doses: { margherita: 75, marinara: 75, calzone: 50 }, prices: 28 },
          mozzarella: { name: 'Mozzarella / Fior di Latte', unit: 'g', doses: { margherita: 90, marinara: 0, calzone: 90 }, prices: 65 },
          evoo: { name: 'Azeite extravirgem', unit: 'g', doses: { margherita: 7, marinara: 7, calzone: 5 }, prices: 60 },
          grana: { name: 'Queijo duro ralado', unit: 'g', doses: { margherita: 6, marinara: 0, calzone: 6 }, prices: 90 },
          basilico: { name: 'Manjericão fresco', unit: 'g', doses: { margherita: 3, marinara: 2, calzone: 0 }, prices: 40 },
          alho: { name: 'Alho fresco laminado', unit: 'g', doses: { margherita: 0, marinara: 3, calzone: 0 }, prices: 30 },
          oregano: { name: 'Orégano seco', unit: 'g', doses: { margherita: 0, marinara: 0.5, calzone: 0 }, prices: 80 },
          ricota: { name: 'Ricota fresca', unit: 'g', doses: { margherita: 0, marinara: 0, calzone: 120 }, prices: 35 },
          salame: { name: 'Salame napolitano', unit: 'g', doses: { margherita: 0, marinara: 0, calzone: 40 }, prices: 85 },
          semolina: { name: 'Semolina de abertura', unit: 'g', doses: { margherita: 15, marinara: 15, calzone: 15 }, prices: 18 }
        };

        const readRecipes = () => {
          try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
          catch (error) { return []; }
        };
        const writeRecipes = recipes => {
          try { localStorage.setItem(storageKey, JSON.stringify(recipes)); return true; }
          catch (error) { return false; }
        };
        const money = value => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

        function refreshRecipeSelect() {
          const recipes = readRecipes();
          recipeSelect.innerHTML = '';
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = recipes.length ? 'Selecione uma receita salva' : 'Nenhuma receita salva';
          recipeSelect.appendChild(placeholder);
          recipes.forEach((recipe, index) => {
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = recipe.name;
            recipeSelect.appendChild(option);
          });
        }

        function captureCurrentRecipe() {
          const values = {};
          inputs.forEach(id => { const el = document.getElementById(id); if (el) values[id] = el.value; });
          const mode = document.getElementById('recipe-mode');
          return { name: recipeName.value.trim(), mode: mode ? mode.value : 'ingredients', values, savedAt: new Date().toISOString() };
        }

        function saveCurrentRecipe() {
          const recipe = captureCurrentRecipe();
          if (!recipe.name) { recipeStatus.textContent = 'Informe um nome antes de salvar.'; recipeName.focus(); return; }
          const recipes = readRecipes();
          const existing = recipes.findIndex(item => item.name.toLowerCase() === recipe.name.toLowerCase());
          if (existing >= 0) recipes[existing] = recipe; else recipes.push(recipe);
          if (writeRecipes(recipes)) {
            refreshRecipeSelect();
            recipeStatus.textContent = existing >= 0 ? 'Receita atualizada com sucesso.' : 'Receita salva neste dispositivo.';
          } else recipeStatus.textContent = 'Não foi possível salvar. Verifique o armazenamento do navegador.';
        }

        function loadSelectedRecipe() {
          const index = Number.parseInt(recipeSelect.value, 10);
          const recipe = readRecipes()[index];
          if (!recipe) { recipeStatus.textContent = 'Selecione uma receita salva.'; return; }
          const mode = document.getElementById('recipe-mode');
          if (mode && recipe.mode) { mode.value = recipe.mode; mode.dispatchEvent(new Event('change')); }
          Object.entries(recipe.values || {}).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); }
          });
          recipeName.value = recipe.name;
          recipeStatus.textContent = `Receita “${recipe.name}” carregada.`;
        }

        function deleteSelectedRecipe() {
          const index = Number.parseInt(recipeSelect.value, 10);
          if (!Number.isInteger(index)) { recipeStatus.textContent = 'Selecione uma receita para excluir.'; return; }
          const recipes = readRecipes();
          const removed = recipes.splice(index, 1)[0];
          writeRecipes(recipes); refreshRecipeSelect();
          recipeStatus.textContent = removed ? `Receita “${removed.name}” excluída.` : 'Receita não encontrada.';
        }

        function renderFlavorSheet() {
          const flavor = flavorSelect.value;
          const quantity = Math.max(0, Number(flavorQuantity.value) || 0);
          const price = Math.max(0, Number(flavorPrice.value) || 0);
          let total = 0;
          let rows = '';
          let shopping = '';
          Object.values(ingredientCatalog).forEach(item => {
            const dose = item.doses[flavor] || 0;
            const totalGrams = dose * quantity;
            const cost = (totalGrams / 1000) * item.prices;
            total += cost;
            if (dose > 0) {
              rows += `<tr class="border-b border-gray-800"><td class="py-2 pr-3 text-cream">${item.name}</td><td class="py-2 pr-3 text-gray-400">${dose} ${item.unit}/pizza</td><td class="py-2 text-gold font-semibold">${totalGrams.toFixed(totalGrams < 10 ? 1 : 0)} ${item.unit}</td></tr>`;
              shopping += `<div class="flex justify-between gap-3 text-xs"><span class="text-gray-300">${item.name}</span><span class="text-gold font-semibold">${totalGrams.toFixed(totalGrams < 10 ? 1 : 0)} g</span></div>`;
            }
          });
          flavorSheetBody.innerHTML = `<table class="w-full text-xs text-left"><thead><tr class="text-gray-500 uppercase border-b border-gray-700"><th class="py-2 pr-3">Ingrediente</th><th class="py-2 pr-3">Dose unitária</th><th class="py-2">Total do lote</th></tr></thead><tbody>${rows || '<tr><td colspan="3" class="py-3 text-gray-500">Informe uma quantidade maior que zero.</td></tr>'}</tbody></table>`;
          shoppingBody.innerHTML = shopping || '<p class="text-xs text-gray-500">Nenhum item para este lote.</p>';
          const doughCost = quantity * 3.20;
          const fullCost = total + doughCost;
          flavorCost.textContent = money(fullCost);
          flavorUnitCost.textContent = money(quantity ? fullCost / quantity : 0);
          flavorMargin.textContent = money((price * quantity) - fullCost);
          shoppingTotal.textContent = money(fullCost);
        }

        document.getElementById('recipe-save-btn').addEventListener('click', saveCurrentRecipe);
        document.getElementById('recipe-load-btn').addEventListener('click', loadSelectedRecipe);
        document.getElementById('recipe-delete-btn').addEventListener('click', deleteSelectedRecipe);
        document.getElementById('recipe-new-btn').addEventListener('click', () => { recipeName.value = ''; recipeStatus.textContent = 'Nome limpo. A receita atual continua disponível para edição.'; recipeName.focus(); });
        [flavorSelect, flavorQuantity, flavorPrice].forEach(el => el.addEventListener('input', renderFlavorSheet));
        document.getElementById('shopping-print-btn').addEventListener('click', () => window.print());
        document.querySelectorAll('#aba1 input, #aba1 select').forEach(el => el.addEventListener('input', renderFlavorSheet));
        refreshRecipeSelect();
        renderFlavorSheet();
      })();
    } catch (error) {
      console.error('Erro na biblioteca de receitas e ficha técnica:', error);
    }

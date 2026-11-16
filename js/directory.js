/* ==========================================================================
       MÓDULO 0: CONTADOR DE VISITAS LOCAL
       ========================================================================== */
    try {
      (function initCounter() {
        const STORAGE_KEY_TOTAL = 'avpn_total_visits';
        const STORAGE_KEY_LAST = 'avpn_last_visit_date';
        const SESSION_KEY = 'avpn_session_logged';
        const INITIAL_TOTAL = 1420;

        const display = document.getElementById('counter-display');
        const tooltipVisits = document.getElementById('tooltip-session-visits');
        const tooltipLast = document.getElementById('tooltip-last-visit');

        const readStorage = (storage, key, fallback = null) => {
          try {
            return storage.getItem(key) ?? fallback;
          } catch (error) {
            return fallback;
          }
        };

        const writeStorage = (storage, key, value) => {
          try {
            storage.setItem(key, String(value));
          } catch (error) {
            // Alguns navegadores bloqueiam storage; o contador ainda deve aparecer.
          }
        };

        const parseVisits = value => {
          const parsed = Number.parseInt(value, 10);
          return Number.isFinite(parsed) && parsed >= 0 ? parsed : INITIAL_TOTAL;
        };

        let visits = parseVisits(readStorage(localStorage, STORAGE_KEY_TOTAL, INITIAL_TOTAL));
        let lastVisit = readStorage(localStorage, STORAGE_KEY_LAST, null);
        const isNewSession = readStorage(sessionStorage, SESSION_KEY, null) !== '1';

        // Incrementa uma vez por sessão de navegação, não a cada atualização da página.
        if (isNewSession) {
          visits += 1;
          lastVisit = new Date().toLocaleString('pt-BR');
          writeStorage(localStorage, STORAGE_KEY_TOTAL, visits);
          writeStorage(localStorage, STORAGE_KEY_LAST, lastVisit);
          writeStorage(sessionStorage, SESSION_KEY, '1');
        }

        if (!lastVisit) {
          lastVisit = 'Ainda não registrado';
          writeStorage(localStorage, STORAGE_KEY_LAST, lastVisit);
        }

        const renderCounter = total => {
          const safeTotal = parseVisits(total);
          if (display) display.textContent = safeTotal.toLocaleString('pt-BR');
          if (tooltipVisits) tooltipVisits.textContent = `Acessos neste dispositivo: ${safeTotal.toLocaleString('pt-BR')}`;
          if (tooltipLast) tooltipLast.textContent = `Última visita: ${lastVisit}`;
        };

        // O contador é deliberadamente local: funciona sem rede, CORS ou serviço de terceiros.
        renderCounter(visits);
      })();
    } catch (err) {
      // Falhas de storage/rede não podem deixar o badge preso em "---".
      const fallbackDisplay = document.getElementById('counter-display');
      if (fallbackDisplay) fallbackDisplay.textContent = '1.421';
      console.error('Erro no contador de visitas:', err);
    }

    /* ==========================================================================
       MÓDULO 1: CALCULADORA DE MASSA AVPN & TABELA DINÂMICA
       ========================================================================== */
    try {
      (function initCalculadora() {
        // Elementos DOM
        const inputAgua = document.getElementById('input-agua');
        const sliderAgua = document.getElementById('slider-agua');
        const recipeMode = document.getElementById('recipe-mode');
        const recipeReference = document.getElementById('recipe-reference');
        const inputQtd = document.getElementById('input-qtd');
        const sliderQtd = document.getElementById('slider-qtd');
        const inputPeso = document.getElementById('input-peso');
        const pesoLabel = document.getElementById('peso-label');
        const recipeModeHelp = document.getElementById('recipe-mode-help');
        const inputHidrat = document.getElementById('input-hidratacao');
        const sliderHidrat = document.getElementById('slider-hidratacao');
        const inputFarinha = document.getElementById('input-farinha');
        const sliderFarinha = document.getElementById('slider-farinha');
        const inputSal = document.getElementById('input-sal');
        const sliderSal = document.getElementById('slider-sal');
        const inputFerm = document.getElementById('input-fermento');
        const sliderFerm = document.getElementById('slider-fermento');

        // Elementos Resultado
        const resFarinha = document.getElementById('res-farinha');
        const resAgua = document.getElementById('res-agua');
        const resSal = document.getElementById('res-sal');
        const resFermFresco = document.getElementById('res-fermento-fresco');
        const resFermSeco = document.getElementById('res-fermento-seco');
        const resTotalBadge = document.getElementById('res-massa-total-badge');
        const badgeStatus = document.getElementById('avpn-status-badge');
        const warningsContainer = document.getElementById('avpn-warnings-list');
        const tableBody = document.getElementById('table-scaling-body');
        const aguaHelp = document.getElementById('agua-help');
        const farinhaHelp = document.getElementById('farinha-help');

        // Sincronização de Sliders e Numeric Inputs
        function bindSync(input, slider) {
          input.addEventListener('input', () => { slider.value = input.value; calcular(); });
          slider.addEventListener('input', () => { input.value = slider.value; calcular(); });
        }

        bindSync(inputAgua, sliderAgua);
        bindSync(inputQtd, sliderQtd);
        bindSync(inputHidrat, sliderHidrat);
        bindSync(inputFarinha, sliderFarinha);
        bindSync(inputSal, sliderSal);
        bindSync(inputFerm, sliderFerm);

        function updateRecipeModeUI() {
          const isCartelaMode = recipeMode.value === 'cartela';
          const usesFlourReference = recipeReference.value === 'flour' && !isCartelaMode;
          inputAgua.readOnly = isCartelaMode || usesFlourReference;
          sliderAgua.disabled = isCartelaMode || usesFlourReference;
          inputFarinha.readOnly = isCartelaMode || !usesFlourReference;
          sliderFarinha.disabled = isCartelaMode || !usesFlourReference;
          recipeReference.disabled = isCartelaMode;
          inputPeso.readOnly = !isCartelaMode;
          inputAgua.classList.toggle('opacity-60', isCartelaMode || usesFlourReference);
          sliderAgua.classList.toggle('opacity-50', isCartelaMode || usesFlourReference);
          inputFarinha.classList.toggle('opacity-60', isCartelaMode || !usesFlourReference);
          sliderFarinha.classList.toggle('opacity-50', isCartelaMode || !usesFlourReference);
          inputPeso.classList.toggle('bg-charcoal/70', !isCartelaMode);
          inputPeso.classList.toggle('border-terracotta/60', isCartelaMode);
          pesoLabel.textContent = isCartelaMode ? 'Peso desejado por panetto:' : 'Peso calculado por panetto:';
          aguaHelp.textContent = isCartelaMode
            ? 'Calculada a partir da quantidade e do peso dos panetti.'
            : usesFlourReference ? 'Calculada pela farinha e pela hidratação.' : 'Referência editável. Informe a água somente em peso.';
          farinhaHelp.textContent = isCartelaMode
            ? 'Calculada a partir do total da massa.'
            : usesFlourReference ? 'Referência editável. Informe a farinha em peso.' : 'Calculada a partir da água e da hidratação.';
          recipeModeHelp.textContent = isCartelaMode
            ? 'Informe quantidade e peso dos panetti. A calculadora ajustará automaticamente a água, o sal, a farinha e o fermento da cartela.'
            : usesFlourReference ? 'No modo farinha, informe o peso da farinha. A água será calculada pela hidratação.' : 'No modo água, informe o peso da água. A farinha será calculada pela hidratação.';
        }

        inputPeso.addEventListener('input', calcular);
        recipeMode.addEventListener('change', () => {
          updateRecipeModeUI();
          calcular();
        });
        recipeReference.addEventListener('change', () => {
          updateRecipeModeUI();
          calcular();
        });

        function calcular() {
          const aguaInformada = parseFloat(inputAgua.value) || 1000;
          const qtd = parseFloat(inputQtd.value) || 12;
          const pesoInformado = parseFloat(inputPeso.value) || 239;
          const hidrat = parseFloat(inputHidrat.value) || 55;
          const salGL = parseFloat(inputSal.value) || 55;
          const fermGL = parseFloat(inputFerm.value) || 0.2;
          const farinhaInformada = parseFloat(inputFarinha.value) || 1818;

          let agua;
          let farinha;
          let massaTotalGramos;
          if (recipeMode.value === 'cartela') {
            // Modo cartela: quantidade e peso dos panetti determinam a massa total.
            massaTotalGramos = qtd * pesoInformado;
            const proporcaoSoma = 1 + (100 / hidrat) + (salGL / 1000) + (fermGL / 1000);
            agua = massaTotalGramos / proporcaoSoma;
            farinha = agua / (hidrat / 100);
          } else if (recipeReference.value === 'flour') {
            farinha = farinhaInformada;
            agua = farinha * (hidrat / 100);
          } else {
            // Modo ingredientes: a quantidade de água é o primeiro elemento informado.
            agua = aguaInformada;
            farinha = agua / (hidrat / 100);
          }
          const sal = (agua / 1000) * salGL;
          const fermFresco = (agua / 1000) * fermGL;
          const fermSeco = fermFresco / 3;
          massaTotalGramos = massaTotalGramos || (agua + farinha + sal + fermFresco);
          const peso = massaTotalGramos / qtd;
          inputAgua.value = Math.round(agua);
          sliderAgua.value = Math.min(Math.max(Math.round(agua), Number(sliderAgua.min)), Number(sliderAgua.max));
          inputFarinha.value = Math.round(farinha);
          sliderFarinha.value = Math.min(Math.max(Math.round(farinha), Number(sliderFarinha.min)), Number(sliderFarinha.max));
          inputPeso.value = Math.round(peso);

          // Exibição nos cards
          resFarinha.textContent = `${Math.round(farinha).toLocaleString('pt-BR')} g`;
          resAgua.textContent = `${Math.round(agua).toLocaleString('pt-BR')} g`;
          resSal.textContent = `${sal.toFixed(1)} g`;
          resFermFresco.textContent = `${fermFresco.toFixed(2)} g`;
          resFermSeco.textContent = `${fermSeco.toFixed(2)} g`;
          resTotalBadge.textContent = `Total: ${(massaTotalGramos / 1000).toFixed(2)} kg`;

          // Validação de Conformidade AVPN
          const warnings = [];
          if (peso < 200 || peso > 280) warnings.push(`• Peso por panetto (${peso}g) fora da faixa AVPN de 200g a 280g.`);
          if (hidrat < 55.0 || hidrat > 62.5) warnings.push(`• Hidratação (${hidrat}%) fora da faixa AVPN de 55,0% a 62,5%.`);
          if (salGL < 40 || salGL > 60) warnings.push(`• Sal (${salGL}g/L) fora da faixa AVPN de 40g a 60g por litro.`);
          if (fermGL < 0.1 || fermGL > 3.0) warnings.push(`• Fermento (${fermGL}g/L) fora da faixa AVPN de 0.1g a 3.0g/L.`);

          if (warnings.length === 0) {
            badgeStatus.className = "px-4 py-2 rounded-lg bg-avpnGreen/20 border border-avpnGreen text-green-300 text-sm font-semibold flex items-center gap-2";
            badgeStatus.innerHTML = "<span>✓ Totalmente Conforme com o Disciplinare AVPN</span>";
            warningsContainer.innerHTML = "<p class='text-green-400'>• Todos os parâmetros respeitam as diretrizes oficiais de Nápoles.</p>";
          } else {
            badgeStatus.className = "px-4 py-2 rounded-lg bg-amber-900/30 border border-amber-600 text-amber-300 text-sm font-semibold flex items-center gap-2";
            badgeStatus.innerHTML = "<span>⚠ Fora dos Padrões AVPN</span>";
            warningsContainer.innerHTML = warnings.map(w => `<p>${w}</p>`).join('');
          }

          // Atualização da Tabela Dinâmica de Escalonamento
          renderTabelaEscalonamento(agua, hidrat, salGL, fermGL, qtd);
        }

        function renderTabelaEscalonamento(aguaBase, hidrat, salGL, fermGL, currentQtd) {
          const lotes = [1, 2, 5, 10, 12, 14, 16, 20, 30, 40, 50];

          let html = '';
          lotes.forEach(lote => {
            const agua = aguaBase * (lote / currentQtd);
            const farinha = agua / (hidrat / 100);
            const sal = (agua / 1000) * salGL;
            const fFresco = (agua / 1000) * fermGL;
            const massaG = agua + farinha + sal + fFresco;
            const pesoPizza = massaG / lote;

            const isSelected = lote === parseInt(currentQtd, 10);
            const rowClass = isSelected ? 'bg-terracotta/20 font-bold border-l-4 border-terracotta text-cream' : 'hover:bg-charcoal/50 text-gray-300';

            html += `
              <tr class="${rowClass} transition">
                <td class="p-3">${lote} ${isSelected ? '<span class="text-[10px] bg-terracotta px-1.5 py-0.5 rounded ml-1 text-white">ATUAL</span>' : ''}</td>
                <td class="p-3 text-gold">${Math.round(pesoPizza).toLocaleString('pt-BR')} g</td>
                <td class="p-3 text-blue-300">${Math.round(agua).toLocaleString('pt-BR')} g</td>
                <td class="p-3">${Math.round(farinha).toLocaleString('pt-BR')} g</td>
                <td class="p-3">${sal.toFixed(1)} g</td>
                <td class="p-3 text-gold">${fFresco.toFixed(2)} g</td>
                <td class="p-3 text-right font-mono text-cream">${(massaG / 1000).toFixed(2)} kg</td>
              </tr>
            `;
          });
          tableBody.innerHTML = html;
        }

        // Inicializa o modo padrão e executa o primeiro cálculo
        updateRecipeModeUI();
        calcular();
      })();
    } catch (err) {
      console.error('Erro na calculadora de massa:', err);
    }

    /* ==========================================================================
       MÓDULO 2: CRONOGRAMA OPERACIONAL REVERSO
       ========================================================================== */
    try {
      (function initCronograma() {
        const dateInput = document.getElementById('crono-date');
        const timeInput = document.getElementById('crono-time');
        const puntataSelect = document.getElementById('crono-puntata');
        const preparationSelect = document.getElementById('crono-preparation-hours');
        const finalizationSelect = document.getElementById('crono-finalization-hours');
        const fornoSelect = document.getElementById('crono-forno-prep');
        const totalHoursDisplay = document.getElementById('crono-total-hours');
        const container = document.getElementById('crono-timeline-container');
        const progressBar = document.getElementById('crono-progress-bar');
        const progressText = document.getElementById('crono-progress-text');
        const validationMessage = document.getElementById('crono-validation-message');

        // Estado do Checklist
        const checkedStages = new Set();

        function getNextBusinessDate() {
          const date = new Date();
          date.setHours(12, 0, 0, 0);
          do {
            date.setDate(date.getDate() + 1);
          } while (date.getDay() === 0 || date.getDay() === 6);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }

        if (!dateInput.value) dateInput.value = getNextBusinessDate();

        function recalcularCronograma() {
          const dateStr = dateInput.value;
          const timeStr = timeInput.value;
          if (!dateStr || !timeStr) return;

          const targetDate = new Date(`${dateStr}T${timeStr}:00`);
          const puntataHours = parseFloat(puntataSelect.value);
          const preparationHours = Math.min(24, Math.max(1, parseFloat(preparationSelect.value)));
          const finalizationHours = Math.min(4, Math.max(0, parseFloat(finalizationSelect.value)));
          const totalFermentationHours = preparationHours;
          const apprettoHours = totalFermentationHours - puntataHours;
          const fornoMinutes = parseInt(fornoSelect.value, 10);

          totalHoursDisplay.textContent = `${preparationHours}h preparação + até ${finalizationHours}h finalização`;
          if (apprettoHours < 0) {
            validationMessage.textContent = 'A duração da puntata não pode ultrapassar o tempo total de preparação. Selecione um período maior.';
            validationMessage.classList.remove('hidden');
            return;
          }
          validationMessage.classList.add('hidden');

          // Cálculo dos 6 Passos Operacionais Reversos:
          // 6. Serviço (Target Date; a finalização pode se estender por até 4h)
          // 5. Aquecimento do Forno: (Target Date - FornoMinutes)
          // 4. Appretto (Segunda Fermentação): (Target Date - ApprettoHours)
          // 3. Staglio (Boleamento): 30 min antes do Appretto
          // 2. Puntata (Primeira Fermentação): 2h (ou puntataHours) antes do Staglio
          // 1. Amassamento: 30 min antes da Puntata

          const tService = new Date(targetDate.getTime());
          const tForno = new Date(tService.getTime() - (fornoMinutes * 60 * 1000));
          const tApprettoStart = new Date(tService.getTime() - (apprettoHours * 60 * 60 * 1000));
          const tStaglioStart = new Date(tApprettoStart.getTime() - (30 * 60 * 1000));
          const tPuntataStart = new Date(tStaglioStart.getTime() - (puntataHours * 60 * 60 * 1000));
          const tAmassamentoStart = new Date(tPuntataStart.getTime() - (30 * 60 * 1000));

          const stages = [
            {
              id: 1,
              title: "1. Amassamento & Ponto de Corda",
              desc: "Mistura da água, sal, 10% da farinha, fermento e farinha restante. Batimento na amassadeira de braços mergulhadores ou espiral até a liga perfeita.",
              timeStart: tAmassamentoStart,
              timeEnd: tPuntataStart,
              tecnica: "Temperatura da massa no tacho: 16°C a 22°C."
            },
            {
              id: 2,
              title: "2. Primeira Fermentação em Bloco (Puntata)",
              desc: "Descanso da massa inteira coberta com pano úmido ou filme plástico em bancada para relaxamento do glúten.",
              timeStart: tPuntataStart,
              timeEnd: tStaglioStart,
              tecnica: `Duração: ${puntataHours}h • Temperatura Ambiente ideal: 20°C a 24°C.`
            },
            {
              id: 3,
              title: "3. Porcionamento e Boleamento (Staglio)",
              desc: "Corte manual e modelagem das bolinhas (panetti) de 200g a 280g com fechamento inferior hermético (mozzatura).",
              timeStart: tStaglioStart,
              timeEnd: tApprettoStart,
              tecnica: "Acondicionar em caixas plásticas de alimento (Mattarelle)."
            },
            {
              id: 4,
              title: "4. Segunda Fermentação em Bolas (Appretto)",
              desc: "Maturação lenta e fermentação dos panetti em caixas fechadas até triplicarem suavemente de volume.",
              timeStart: tApprettoStart,
              timeEnd: tService,
              tecnica: `Duração: ${apprettoHours}h • Caixas niveladas e sem correntes de ar.`
            },
            {
              id: 5,
              title: "5. Aquecimento e Estabilização do Forno Napolitano",
              desc: "Acendimento da lenha ou gás. Aquecimento gradual do piso refratário (soleira Biscotto di Caserta).",
              timeStart: tForno,
              timeEnd: tService,
              tecnica: "Soleira: 380°C–430°C • Cúpula: 485°C."
            },
            {
              id: 6,
              title: "6. Abertura, Forneamento e Finalização do Serviço",
              desc: "Abertura manual do disco a partir do centro (stenditura à mão na semolina), cobertura rápida e assamento em 60–90 segundos. Esta etapa pode se estender por até 4 horas para concluir o serviço.",
              timeStart: tService,
              timeEnd: new Date(tService.getTime() + (finalizationHours * 60 * 60 * 1000)),
              tecnica: `Janela de finalização: até ${finalizationHours}h • Girar a pizza 180° no forno com a pá de virar (palino).`
            }
          ];

          function formatDate(d) {
            const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const dia = String(d.getDate()).padStart(2, '0');
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const hora = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            return `${dias[d.getDay()]} ${dia}/${mes} às ${hora}:${min}`;
          }

          let html = '';
          stages.forEach(st => {
            const isChecked = checkedStages.has(st.id);
            html += `
              <div class="p-4 rounded-lg bg-charcoal border ${isChecked ? 'border-avpnGreen/50 bg-avpnGreen/5' : 'border-gray-800'} transition flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div class="flex items-start space-x-3">
                  <input type="checkbox" onchange="window.toggleCronoCheck(${st.id})" ${isChecked ? 'checked' : ''} class="mt-1 w-5 h-5 accent-terracotta rounded cursor-pointer">
                  <div>
                    <h4 class="font-bold text-sm text-cream ${isChecked ? 'line-through text-gray-500' : ''}">${st.title}</h4>
                    <p class="text-xs text-gray-400 mt-0.5">${st.desc}</p>
                    <span class="inline-block mt-1 text-[11px] text-gold font-mono bg-gold/10 px-2 py-0.5 rounded border border-gold/20">${st.tecnica}</span>
                  </div>
                </div>
                <div class="text-right flex-shrink-0 self-end md:self-center">
                  <span class="text-[10px] text-gray-500 block uppercase font-mono">Horário Previsto:</span>
                  <span class="text-xs font-bold text-terracotta bg-terracotta/10 px-2.5 py-1 rounded border border-terracotta/20">
                    ${formatDate(st.timeStart)}
                  </span>
                  <span class="text-[10px] text-gray-500 block mt-1">até ${formatDate(st.timeEnd)}</span>
                </div>
              </div>
            `;
          });

          container.innerHTML = html;
          updateProgress(stages.length);
        }

        window.toggleCronoCheck = function(id) {
          if (checkedStages.has(id)) {
            checkedStages.delete(id);
          } else {
            checkedStages.add(id);
          }
          recalcularCronograma();
        };

        function updateProgress(total) {
          const pct = Math.round((checkedStages.size / total) * 100);
          progressBar.style.width = `${pct}%`;
          progressText.textContent = `${pct}%`;
        }

        [dateInput, timeInput, puntataSelect, preparationSelect, finalizationSelect, fornoSelect].forEach(el => {
          el.addEventListener('change', recalcularCronograma);
        });

        recalcularCronograma();
      })();
    } catch (err) {
      console.error('Erro no cronograma operacional:', err);
    }

    /* ==========================================================================
       MÓDULO 3: COBERTURAS, LISTA DE COMPRAS & CMV
       ========================================================================== */
    try {
      (function initCMV() {
        // Quantidades do Mix
        const inputMargherita = document.getElementById('mix-margherita');
        const inputMarinara = document.getElementById('mix-marinara');
        const inputCalzone = document.getElementById('mix-calzone');
        const mixTotalDisplay = document.getElementById('mix-total-display');

        // Resumo Financeiro
        const cmvMassa = document.getElementById('cmv-custo-massa');
        const cmvCoberturas = document.getElementById('cmv-custo-coberturas');
        const cmvUnitario = document.getElementById('cmv-custo-unitario');
        const cmvPrecoSugerido = document.getElementById('cmv-preco-sugerido');
        const cmvTotal = document.getElementById('cmv-custo-total');
        const tableBody = document.getElementById('cmv-table-body');

        // Tabela Estática de Insumos com Doses Unitárias (g/un) e Preços Padrão (R$/kg)
        const insumos = [
          { id: 'tomate', name: 'Tomate Pelado San Marzano / Roma D.O.P.', doseMarg: 75, doseMarin: 75, doseCalz: 50, priceKg: 28.00, unit: 'kg' },
          { id: 'mozzarella', name: 'Mozzarella di Bufala / Fior di Latte', doseMarg: 90, doseMarin: 0, doseCalz: 90, priceKg: 65.00, unit: 'kg' },
          { id: 'evoo', name: 'Azeite de Oliva Extra Virgem (EVOO)', doseMarg: 7, doseMarin: 7, doseCalz: 5, priceKg: 60.00, unit: 'L' },
          { id: 'grana', name: 'Queijo Duro Ralado (Grana Padano / Parmigiano)', doseMarg: 6, doseMarin: 0, doseCalz: 6, priceKg: 90.00, unit: 'kg' },
          { id: 'basilico', name: 'Manjericão Fresco Basílico', doseMarg: 3, doseMarin: 2, doseCalz: 0, priceKg: 40.00, unit: 'kg' },
          { id: 'alho', name: 'Alho Fresco Laminado', doseMarg: 0, doseMarin: 3, doseCalz: 0, priceKg: 30.00, unit: 'kg' },
          { id: 'oregano', name: 'Orégano Seco Aromático', doseMarg: 0, doseMarin: 0.5, doseCalz: 0, priceKg: 80.00, unit: 'kg' },
          { id: 'ricota', name: 'Ricota Fresca de Búfala', doseMarg: 0, doseMarin: 0, doseCalz: 120, priceKg: 35.00, unit: 'kg' },
          { id: 'salame', name: 'Salame Napolitano Fatiado', doseMarg: 0, doseMarin: 0, doseCalz: 40, priceKg: 85.00, unit: 'kg' },
          { id: 'semolina', name: 'Semolina de Trigo Duro (Abertura)', doseMarg: 15, doseMarin: 15, doseCalz: 15, priceKg: 18.00, unit: 'kg' }
        ];

        function recalcularCMV() {
          const qMarg = parseInt(inputMargherita.value, 10) || 0;
          const qMarin = parseInt(inputMarinara.value, 10) || 0;
          const qCalz = parseInt(inputCalzone.value, 10) || 0;
          const totalPizzas = qMarg + qMarin + qCalz;

          mixTotalDisplay.textContent = `${totalPizzas} Unidades`;

          // Custo da Massa Estimado (Massa ~ R$ 3,50 por pizza de 200g baseada nos insumos da Aba 1)
          const custoMassaTotal = totalPizzas * 3.20;

          let custoCoberturasTotal = 0;
          let tableHtml = '';

          insumos.forEach(item => {
            // Peso total em gramas
            const totalGramos = (qMarg * item.doseMarg) + (qMarin * item.doseMarin) + (qCalz * item.doseCalz);
            const totalKg = totalGramos / 1000;
            const custoItem = totalKg * item.priceKg;
            custoCoberturasTotal += custoItem;

            tableHtml += `
              <tr class="hover:bg-charcoal/50 transition">
                <td class="p-3 font-medium text-cream">${item.name}</td>
                <td class="p-3 text-gray-400">Marg: ${item.doseMarg}g | Marin: ${item.doseMarin}g | Calz: ${item.doseCalz}g</td>
                <td class="p-3">
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-gray-500">R$</span>
                    <input type="number" step="0.5" value="${item.priceKg.toFixed(2)}" onchange="window.updateInsumoPrice('${item.id}', this.value)" class="w-16 bg-charcoal border border-gray-700 rounded px-1.5 py-0.5 text-right text-xs text-gold">
                  </div>
                </td>
                <td class="p-3 font-mono text-gold font-bold">${totalKg > 0 ? totalKg.toFixed(2) + ' ' + item.unit : '0.00 ' + item.unit}</td>
                <td class="p-3 text-right font-mono text-cream font-bold">R$ ${custoItem.toFixed(2)}</td>
              </tr>
            `;
          });

          const custoInvestimentoTotal = custoMassaTotal + custoCoberturasTotal;
          const custoPorPizza = totalPizzas > 0 ? (custoInvestimentoTotal / totalPizzas) : 0;
          // Preço Sugerido com Margem CMV de ~30% (Multiplicador 3.3x)
          const precoSugeridoUnitario = custoPorPizza * 3.33;

          cmvMassa.textContent = `R$ ${custoMassaTotal.toFixed(2)}`;
          cmvCoberturas.textContent = `R$ ${custoCoberturasTotal.toFixed(2)}`;
          cmvUnitario.textContent = `R$ ${custoPorPizza.toFixed(2)}`;
          cmvPrecoSugerido.textContent = `R$ ${precoSugeridoUnitario.toFixed(2)}`;
          cmvTotal.textContent = `R$ ${custoInvestimentoTotal.toFixed(2)}`;

          tableBody.innerHTML = tableHtml;
        }

        window.updateInsumoPrice = function(id, newPrice) {
          const item = insumos.find(i => i.id === id);
          if (item) {
            item.priceKg = parseFloat(newPrice) || 0;
            recalcularCMV();
          }
        };

        [inputMargherita, inputMarinara, inputCalzone].forEach(el => {
          el.addEventListener('input', recalcularCMV);
        });

        recalcularCMV();
      })();
    } catch (err) {
      console.error('Erro no módulo de CMV:', err);
    }

    /* ==========================================================================
       MÓDULO 4: SIMULADOR PESO X DIÂMETRO & CORNICIONE (SVG 2D / VISTA LATERAL)
       ========================================================================== */
    try {
      (function initSimulador() {
        const modeSelect = document.getElementById('sim-mode');
        const viewSelect = document.getElementById('sim-view-select');
        const slidePeso = document.getElementById('sim-slide-peso');
        const slideDiametro = document.getElementById('sim-slide-diametro');
        const slideBorda = document.getElementById('sim-slide-borda');
        const slideCentro = document.getElementById('sim-slide-centro');

        const valPeso = document.getElementById('sim-val-peso');
        const valDiametro = document.getElementById('sim-val-diametro');
        const valBorda = document.getElementById('sim-val-borda');
        const valCentro = document.getElementById('sim-val-centro');

        const svgTop = document.getElementById('svg-top-view');
        const svgSide = document.getElementById('svg-side-view');
        const cardTop = document.getElementById('sim-card-top');
        const cardSide = document.getElementById('sim-card-side');
        const tableBody = document.getElementById('sim-table-body');

        function atualizarSimulador() {
          const peso = parseFloat(slidePeso.value);
          const mode = modeSelect.value;

          let diametro = 0;
          if (mode === 'auto') {
            // Fórmula Linear AVPN: D = 22.0 + (Peso - 200) * 0.1625 cm
            diametro = 22.0 + (peso - 200) * 0.1625;
            slideDiametro.value = diametro.toFixed(1);
            slideDiametro.disabled = true;
          } else {
            slideDiametro.disabled = false;
            diametro = parseFloat(slideDiametro.value);
          }

          const borda = parseFloat(slideBorda.value);
          const centro = parseFloat(slideCentro.value);

          valPeso.textContent = `${peso} g`;
          valDiametro.textContent = `${diametro.toFixed(1)} cm`;
          valBorda.textContent = `${borda.toFixed(1)} cm`;
          valCentro.textContent = `${centro.toFixed(1)} mm`;

          renderSVGTop(diametro);
          renderSVGSide(diametro, borda, centro);
          renderTabelaComparativa(peso);
        }

        // Renderização SVG da Vista Superior (Com Leoparding e Ingredientes)
        function renderSVGTop(diametro) {
          // Escala: 35cm max -> raio max ~130px no viewBox 300x300
          const radius = (diametro / 35) * 125;
          const cx = 150, cy = 150;
          const innerRadius = radius * 0.78;

          svgTop.innerHTML = `
            <!-- Sombra externa da pizza -->
            <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#000" opacity="0.4" filter="blur(8px)" />

            <!-- Borda da pizza (Cornicione dourado) -->
            <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#crustGradient)" stroke="#8B4513" stroke-width="2"/>

            <!-- Molho de Tomate San Marzano -->
            <circle cx="${cx}" cy="${cy}" r="${innerRadius}" fill="#C84B31" />

            <!-- Textura de Molho -->
            <circle cx="${cx}" cy="${cy}" r="${innerRadius * 0.9}" fill="#B22222" opacity="0.4" />

            <!-- Fior di Latte / Mozzarella (Manchas brancas) -->
            <circle cx="${cx - innerRadius * 0.3}" cy="${cy - innerRadius * 0.2}" r="${innerRadius * 0.22}" fill="#F8F5F2" opacity="0.9" />
            <circle cx="${cx + innerRadius * 0.2}" cy="${cy + innerRadius * 0.3}" r="${innerRadius * 0.25}" fill="#F8F5F2" opacity="0.9" />
            <circle cx="${cx + innerRadius * 0.1}" cy="${cy - innerRadius * 0.4}" r="${innerRadius * 0.18}" fill="#F8F5F2" opacity="0.9" />
            <circle cx="${cx - innerRadius * 0.4}" cy="${cy + innerRadius * 0.2}" r="${innerRadius * 0.2}" fill="#F8F5F2" opacity="0.9" />

            <!-- Folhas de Manjericão -->
            <path d="M ${cx - 10} ${cy - 10} Q ${cx - 25} ${cy - 30} ${cx} ${cy - 35} Q ${cx + 10} ${cy - 20} ${cx - 10} ${cy - 10}" fill="#2D6A4F" />
            <path d="M ${cx + 15} ${cy + 15} Q ${cx + 35} ${cy + 5} ${cx + 30} ${cy + 30} Q ${cx + 10} ${cy + 35} ${cx + 15} ${cy + 15}" fill="#2D6A4F" />

            <!-- Pintas de Leoparding (Queimado de Forno Napolitano) -->
            <circle cx="${cx - radius * 0.85}" cy="${cy - radius * 0.2}" r="3" fill="#1A0D00" />
            <circle cx="${cx - radius * 0.78}" cy="${cy - radius * 0.35}" r="4" fill="#1A0D00" />
            <circle cx="${cx + radius * 0.82}" cy="${cy + radius * 0.1}" r="3.5" fill="#1A0D00" />
            <circle cx="${cx + radius * 0.5}" cy="${cy - radius * 0.72}" r="4.5" fill="#1A0D00" />
            <circle cx="${cx - radius * 0.3}" cy="${cy + radius * 0.82}" r="3" fill="#1A0D00" />

            <!-- Régua de Diâmetro Overlaid -->
            <line x1="${cx - radius}" y1="${cy}" x2="${cx + radius}" y2="${cy}" stroke="#D4A373" stroke-width="1.5" stroke-dasharray="4" />
            <circle cx="${cx - radius}" cy="${cy}" r="3" fill="#D4A373" />
            <circle cx="${cx + radius}" cy="${cy}" r="3" fill="#D4A373" />
            <rect x="${cx - 40}" y="${cy - 12}" width="80" height="24" rx="4" fill="#141211" stroke="#D4A373" stroke-width="1" />
            <text x="${cx}" y="${cy + 4}" font-size="11" font-weight="bold" fill="#D4A373" text-anchor="middle">Ø ${diametro.toFixed(1)} cm</text>

            <defs>
              <radialGradient id="crustGradient" cx="50%" cy="50%" r="50%">
                <stop offset="70%" stop-color="#D4A373" />
                <stop offset="95%" stop-color="#C84B31" />
                <stop offset="100%" stop-color="#8B4513" />
              </radialGradient>
            </defs>
          `;
        }

        // Renderização SVG do Corte Transversal (Pedra Biscotto + Alvéolos)
        function renderSVGSide(diametro, borda, centro) {
          const widthFactor = (diametro / 35) * 320;
          const startX = (400 - widthFactor) / 2;
          const endX = startX + widthFactor;
          const baseY = 160;

          // Altura visual em px
          const borderH = borda * 28;
          const centerH = centro * 4;

          svgSide.innerHTML = `
            <!-- Pedra Refratária Biscotto di Caserta -->
            <rect x="20" y="${baseY}" width="360" height="16" fill="#332C27" rx="2" stroke="#55463D" />
            <text x="200" y="${baseY + 12}" font-size="9" fill="#D4A373" text-anchor="middle" font-weight="bold">PEDRA REFRATÁRIA BISCOTTO DI CASERTA (485°C)</text>

            <!-- Brilho de Calor Radiante do Forno -->
            <line x1="30" y1="${baseY - 1}" x2="370" y2="${baseY - 1}" stroke="#FF4500" stroke-width="2" opacity="0.8" filter="blur(1px)" />

            <!-- Perfil Transversal da Massa Assada -->
            <!-- Borda Esquerda Inflada, Centro Fino, Borda Direita Inflada -->
            <path d="
              M ${startX} ${baseY} 
              C ${startX - 10} ${baseY - borderH}, ${startX + 30} ${baseY - borderH}, ${startX + 45} ${baseY - centerH} 
              L ${endX - 45} ${baseY - centerH} 
              C ${endX - 30} ${baseY - borderH}, ${endX + 10} ${baseY - borderH}, ${endX} ${baseY} 
              Z" 
              fill="#E6C280" stroke="#8B4513" stroke-width="1.5" />

            <!-- Camada de Cobertura Derretida no Centro -->
            <rect x="${startX + 40}" y="${baseY - centerH - 3}" width="${widthFactor - 80}" height="4" fill="#C84B31" rx="1" />
            <rect x="${startX + 60}" y="${baseY - centerH - 5}" width="${widthFactor - 120}" height="3" fill="#F8F5F2" rx="1" opacity="0.9" />

            <!-- Alvéolos de Ar no Cornicione (Bolhas Internas) -->
            <ellipse cx="${startX + 18}" cy="${baseY - borderH * 0.5}" rx="8" ry="6" fill="#141211" opacity="0.3" />
            <ellipse cx="${startX + 28}" cy="${baseY - borderH * 0.7}" rx="6" ry="5" fill="#141211" opacity="0.25" />
            <ellipse cx="${endX - 18}" cy="${baseY - borderH * 0.5}" rx="8" ry="6" fill="#141211" opacity="0.3" />
            <ellipse cx="${endX - 28}" cy="${baseY - borderH * 0.7}" rx="6" ry="5" fill="#141211" opacity="0.25" />

            <!-- Linhas de Cota Técnica com Setas -->
            <!-- Cota de Altura da Borda -->
            <line x1="${startX - 15}" y1="${baseY}" x2="${startX - 15}" y2="${baseY - borderH}" stroke="#C84B31" stroke-width="1.5" />
            <text x="${startX - 20}" y="${baseY - borderH / 2}" font-size="10" fill="#C84B31" font-weight="bold" text-anchor="end">${borda.toFixed(1)} cm</text>

            <!-- Cota de Espessura do Centro -->
            <line x1="200" y1="${baseY}" x2="200" y2="${baseY - centerH - 12}" stroke="#2D6A4F" stroke-width="1" stroke-dasharray="2" />
            <text x="200" y="${baseY - centerH - 16}" font-size="10" fill="#2D6A4F" font-weight="bold" text-anchor="middle">${centro.toFixed(1)} mm</text>
          `;
        }

        // Renderização da Tabela Interativa de 200g a 280g
        function renderTabelaComparativa(currentPeso) {
          let html = '';
          for (let p = 200; p <= 280; p += 5) {
            const d = 22.0 + (p - 200) * 0.1625;
            const b = 1.4 + (p - 200) * 0.0075;
            const c = 3.0;

            const isSelected = Math.abs(p - currentPeso) < 2.5;
            const rowClass = isSelected ? 'bg-terracotta/20 font-bold border-l-4 border-terracotta text-cream' : 'hover:bg-charcoal/50 text-gray-300';

            html += `
              <tr class="${rowClass} transition" onclick="window.setSimuladorValues(${p}, ${d.toFixed(1)}, ${b.toFixed(1)}, ${c})">
                <td class="p-3">${p} g</td>
                <td class="p-3 text-gold font-bold">Ø ${d.toFixed(1)} cm</td>
                <td class="p-3">${b.toFixed(1)} cm</td>
                <td class="p-3">${c.toFixed(1)} mm</td>
                <td class="p-3 text-right">
                  <span class="text-[10px] px-2 py-0.5 rounded bg-avpnGreen/20 text-green-300 border border-avpnGreen/40">Conforme AVPN</span>
                </td>
              </tr>
            `;
          }
          tableBody.innerHTML = html;
        }

        window.setSimuladorValues = function(p, d, b, c) {
          slidePeso.value = p;
          slideDiametro.value = d;
          slideBorda.value = b;
          slideCentro.value = c;
          atualizarSimulador();
        };

        // Event Listeners
        [slidePeso, slideDiametro, slideBorda, slideCentro, modeSelect].forEach(el => {
          el.addEventListener('input', atualizarSimulador);
        });

        viewSelect.addEventListener('change', () => {
          const val = viewSelect.value;
          if (val === 'top') {
            cardTop.style.display = 'flex';
            cardSide.style.display = 'none';
          } else if (val === 'side') {
            cardTop.style.display = 'none';
            cardSide.style.display = 'flex';
          } else {
            cardTop.style.display = 'flex';
            cardSide.style.display = 'flex';
          }
        });

        atualizarSimulador();
      })();
    } catch (err) {
      console.error('Erro no simulador de massa:', err);
    }

/* ==========================================================================
       MÓDULO 5: PIZZARIAS AVPN MUNDO & GOOGLE MAPS DIRETÓRIO TRADUZIDO
       ========================================================================== */
    try {
      (function initPizzeriasMap() {
        // Base de Dados Oficial Embarcada (Extraída do PDF AVPN)
        const databaseOriginal = AVPN_DATABASE;;

        // Motor de Tradução para Português
        function traduzirEndereco(origAddress, origCountry, origCity) {
          let addr = origAddress || '';

          const paisesMap = {
            'Italia': 'Itália',
            'Giappone': 'Japão',
            'Stati Uniti': 'Estados Unidos',
            'Regno Unito': 'Reino Unido',
            'Francia': 'França',
            'Spagna': 'Espanha',
            'Germania': 'Alemanha'
          };

          const cidadesMap = {
            'Napoli': 'Nápoles',
            'Roma': 'Roma',
            'Milano': 'Milão',
            'Firenze': 'Florença',
            'Venezia': 'Veneza',
            'Torino': 'Turim',
            'Lisbona': 'Lisboa',
            'Londra': 'Londres',
            'Parigi': 'Paris',
            'Barcellona': 'Barcelona',
            'Atene': 'Atenas',
            'Ginevra': 'Genebra',
            'Zurigo': 'Zurique',
            'San Paolo': 'São Paulo',
            'San Pietroburgo': 'São Petersburgo',
            'Mosca': 'Moscou',
            'Varsavia': 'Varsóvia',
            'Cracovia': 'Cracóvia',
            'Dublino': 'Dublin',
            'Edimburgo': 'Edimburgo',
            'Stoccolma': 'Estocolmo',
            'Bruxelles': 'Bruxelas',
            'Anversa': 'Antuérpia',
            'Zagabria': 'Zagreb',
            'Lubiana': 'Liubliana'
          };

          // Substituições de Vocabulário de Logradouros
          addr = addr.replace(/\bVia\b/gi, 'Rua')
                     .replace(/\bPiazza\b/gi, 'Praça')
                     .replace(/\bPiazzetta\b/gi, 'Praceta')
                     .replace(/\bCorso\b/gi, 'Avenida')
                     .replace(/\bViale\b/gi, 'Alameda')
                     .replace(/\bVicolo\b/gi, 'Beco')
                     .replace(/\bLungomare\b/gi, 'Beira-Mar');

          const paisPt = paisesMap[origCountry] || origCountry;
          const cidadePt = cidadesMap[origCity] || origCity;

          if (origCountry) addr = addr.replace(origCountry, paisPt);
          if (origCity) addr = addr.replace(origCity, cidadePt);

          return {
            enderecoTraduzido: addr,
            paisTraduzido: paisPt,
            cidadeTraduzida: cidadePt
          };
        }

        const normalizeFilterText = value => String(value || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

        const brazilianStates = [
          'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal',
          'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul',
          'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí',
          'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia',
          'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
        ];

        function deriveState(p) {
          if (p.state || p.province) return p.state || p.province;

          const address = String(p.address || '');
          const normalizedAddress = normalizeFilterText(address);
          const brazilianState = brazilianStates.find(state =>
            normalizedAddress.includes(normalizeFilterText(state))
          );
          if (brazilianState) return brazilianState;

          const parentheticalParts = [...address.matchAll(/\(([^)]+)\)/g)]
            .map(match => match[1].trim())
            .filter(Boolean);
          if (parentheticalParts.length > 0) return parentheticalParts[parentheticalParts.length - 1];

          const cityIndex = normalizeFilterText(address).lastIndexOf(normalizeFilterText(p.city));
          if (cityIndex >= 0) {
            const suffix = address.slice(cityIndex + String(p.city || '').length)
              .replace(/^[\s,;()/-]+|[\s,;()/-]+$/g, '')
              .trim();
            if (suffix && !/^\d/.test(suffix)) return suffix;
          }

          return 'Não informado';
        }

        let pizzeriasData = databaseOriginal.map(p => {
          const t = traduzirEndereco(p.address, p.country, p.city);
          return {
            ...p,
            addressPt: t.enderecoTraduzido,
            countryPt: t.paisTraduzido,
            cityPt: t.cidadeTraduzida,
            statePt: deriveState(p)
          };
        });

        // Estado do Filtro e Paginação
        let currentPage = 1;
        const itemsPerPage = 6;
        const pizzeriaRotationKey = 'avpn_pizzeria_rotation_index_v1';
        const bentoIndexById = pizzeriasData.findIndex(p => String(p.id) === '1083');
        const bentoIndexByName = pizzeriasData.findIndex(p => normalizeFilterText(p.name).includes('bento'));
        const defaultPizzeriaIndex = bentoIndexById >= 0 ? bentoIndexById : (bentoIndexByName >= 0 ? bentoIndexByName : 0);
        let startupPizzeriaIndex = defaultPizzeriaIndex;
        if (pizzeriasData.length > 0) {
          try {
            const savedIndex = localStorage.getItem(pizzeriaRotationKey);
            if (savedIndex !== null) {
              const parsedIndex = Number(savedIndex);
              if (Number.isInteger(parsedIndex) && parsedIndex >= 0 && parsedIndex < pizzeriasData.length) {
                startupPizzeriaIndex = parsedIndex;
              }
            }
            localStorage.setItem(pizzeriaRotationKey, String((startupPizzeriaIndex + 1) % pizzeriasData.length));
          } catch (error) {
            // Sem armazenamento local disponível, usa Bento como padrão nesta carga.
          }
        }
        let selectedPizzeria = pizzeriasData[startupPizzeriaIndex] || pizzeriasData[0];
        let mapSatelliteMode = false;
        const favoritesKey = 'avpn_pizzeria_favorites_v1';
        const notesKey = 'avpn_pizzeria_notes_v1';
        let favoriteIds = new Set();
        let personalNotes = {};
        let compareIds = new Set();
        try { favoriteIds = new Set(JSON.parse(localStorage.getItem(favoritesKey) || '[]')); } catch (error) {}
        try { personalNotes = JSON.parse(localStorage.getItem(notesKey) || '{}') || {}; } catch (error) {}

        // Elementos DOM
        const iframe = document.getElementById('google-maps-iframe');
        const mapTitle = document.getElementById('map-pizzeria-title');
        const routeBtn = document.getElementById('map-route-btn');
        const searchInput = document.getElementById('map-search-input');
        const countryFilter = document.getElementById('map-country-filter');
        const cityFilter = document.getElementById('map-city-filter');
        const stateFilter = document.getElementById('map-state-filter');
        const sortFilter = document.getElementById('map-sort-filter');
        const clearFiltersBtn = document.getElementById('map-clear-filters');
        const favoritesFilter = document.getElementById('map-favorites-filter');
        const cardsGrid = document.getElementById('pizzeria-cards-grid');
        const paginationInfo = document.getElementById('pizzeria-pagination-info');
        const btnPrev = document.getElementById('btn-prev-page');
        const btnNext = document.getElementById('btn-next-page');
        const compareList = document.getElementById('directory-compare-list');
        const compareResult = document.getElementById('directory-compare-result');
        const validationResult = document.getElementById('directory-validation-result');
        const detailView = document.getElementById('directory-detail-view');
        const detailContent = document.getElementById('directory-detail-content');
        const browseSections = [...document.querySelectorAll('.directory-browse-section')];

        const escapeHtml = value => String(value ?? 'Não informado').replace(/[&<>'"]/g, character => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[character]));

        function setDirectoryDetailVisible(isVisible) {
          detailView.classList.toggle('hidden', !isVisible);
          browseSections.forEach(section => section.classList.toggle('hidden', isVisible));
        }

        function getPizzeriaHours(pizzeria) {
          const raw = pizzeria.openingHours || pizzeria.opening_hours || pizzeria.hours || pizzeria.horarios || pizzeria.googleHours || pizzeria.google_hours;
          if (!raw) return [];
          if (typeof raw === 'string') return [{ day: 'Horários', value: raw }];
          if (Array.isArray(raw)) return raw.map((value, index) => ({ day: `Dia ${index + 1}`, value: String(value) }));
          return Object.entries(raw).map(([day, value]) => ({ day, value: Array.isArray(value) ? value.join(' · ') : String(value) }));
        }

        function getPizzeriaStatus(pizzeria, hours) {
          if (typeof pizzeria.openNow === 'boolean') return pizzeria.openNow ? 'Aberta agora' : 'Fechada agora';
          if (typeof pizzeria.open_now === 'boolean') return pizzeria.open_now ? 'Aberta agora' : 'Fechada agora';
          return hours.length ? 'Horários cadastrados' : 'Horários não informados';
        }

        function getPizzeriaGallery(pizzeria) {
          const candidates = [pizzeria.logoUrl, pizzeria.imageUrl, pizzeria.image, pizzeria.photoUrl]
            .concat(Array.isArray(pizzeria.photos) ? pizzeria.photos : [])
            .concat(Array.isArray(pizzeria.gallery) ? pizzeria.gallery : []);
          return [...new Set(candidates.filter(value => typeof value === 'string' && /^https?:\/\//i.test(value)))].slice(0, 6);
        }

        function getPizzeriaFeatures(pizzeria) {
          const features = [];
          const add = (label, value) => { if (value === true || (typeof value === 'string' && value.trim())) features.push(value === true || !label ? (value === true ? label : value.trim()) : `${label}: ${value}`); };
          const rawFeatures = pizzeria.features || pizzeria.characteristics || pizzeria.caracteristicas;
          if (Array.isArray(rawFeatures)) rawFeatures.forEach(value => add('', value));
          if (typeof rawFeatures === 'string') rawFeatures.split(/[,;|]/).forEach(value => add('', value.trim()));
          add('Culinária', pizzeria.cuisine || pizzeria.cuisineType || pizzeria.tipoCulinaria);
          add('Forno', pizzeria.ovenType || pizzeria.oven || pizzeria.tipoForno);
          add('Delivery', pizzeria.delivery);
          add('Salão', pizzeria.dineIn ?? pizzeria.dine_in);
          add('Reservas', pizzeria.reservations ?? pizzeria.reserva);
          add('Vegetariano', pizzeria.vegetarian ?? pizzeria.vegetariano);
          add('Vegano', pizzeria.vegan ?? pizzeria.vegano);
          add('Sem glúten', pizzeria.glutenFree ?? pizzeria.semGluten);
          add('Acessibilidade', pizzeria.accessibility ?? pizzeria.acessibilidade);
          add('Estacionamento', pizzeria.parking ?? pizzeria.estacionamento);
          return [...new Set(features.filter(Boolean))].slice(0, 18);
        }

        function getPizzeriaMenuLink(pizzeria) {
          const value = pizzeria.menuUrl || pizzeria.menu_url || pizzeria.menuLink || pizzeria.cardapioUrl || pizzeria.cardapio;
          return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : '';
        }

        function getPizzeriaHistory(pizzeria) {
          return [
            ['História', pizzeria.history || pizzeria.historia || pizzeria.description],
            ['Fundação', pizzeria.foundedYear || pizzeria.yearFounded || pizzeria.anoFundacao],
            ['Fundador', pizzeria.founder || pizzeria.fundador],
            ['Pizzaiolo / responsável', pizzeria.pizzaiolo || pizzeria.owner || pizzeria.responsavel],
            ['Associada à AVPN desde', pizzeria.avpnSince || pizzeria.avpn_since],
            ['Prêmios e reconhecimentos', pizzeria.awards || pizzeria.premios],
            ['Eventos e participações', pizzeria.events || pizzeria.eventos]
          ].filter(([, value]) => value !== undefined && value !== null && String(value).trim());
        }

        function formatDistance(km) {
          return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
        }

        function calculateDistanceKm(lat1, lon1, lat2, lon2) {
          const toRad = value => value * Math.PI / 180;
          const earthRadius = 6371;
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
          return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        function renderPizzeriaDetail(pizzeria) {
          if (!pizzeria) return;
          const isFavorite = favoriteIds.has(String(pizzeria.id));
          const igLink = pizzeria.instagramUrl || (pizzeria.instagram ? `https://instagram.com/${pizzeria.instagram.replace('@', '')}` : '');
          const destinationText = `${pizzeria.name}, ${pizzeria.address}, ${pizzeria.country}`;
          const mapQuery = encodeURIComponent(destinationText);
          const mapLink = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
          const googleRating = pizzeria.googleRating ?? pizzeria.google_rating ?? pizzeria.rating ?? null;
          const googleReviews = pizzeria.googleReviewCount ?? pizzeria.google_review_count ?? pizzeria.reviewCount ?? null;
          const hasGoogleRating = Number.isFinite(Number(googleRating)) && Number(googleRating) > 0 && Number(googleRating) <= 5;
          const googleUpdatedAt = pizzeria.googleRatingUpdatedAt || pizzeria.google_rating_updated_at || pizzeria.ratingUpdatedAt || null;
          const googleSummary = pizzeria.googleReviewSummary || pizzeria.google_review_summary || pizzeria.reviewSummary || '';
          const googleHighlights = Array.isArray(pizzeria.googleReviewHighlights) ? pizzeria.googleReviewHighlights : [];
          const googleRatingHtml = hasGoogleRating
            ? `<span class="text-gold font-bold">${escapeHtml(Number(googleRating).toFixed(1))} / 5</span>${googleReviews ? `<span class="text-gray-500">(${escapeHtml(googleReviews)} avaliações)</span>` : ''}`
            : '<span class="text-gray-400">Consultar avaliação atual</span>';
          const initials = String(pizzeria.name || 'AVPN').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
          const logoHtml = pizzeria.logoUrl
            ? `<img src="${escapeHtml(pizzeria.logoUrl)}" alt="Logo de ${escapeHtml(pizzeria.name)}" class="detail-pizzeria-logo" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="detail-pizzeria-logo-fallback" hidden>${escapeHtml(initials)}</div>`
            : `<div class="detail-pizzeria-logo-fallback">${escapeHtml(initials)}</div>`;
          const routeLink = (pizzeria.lat && pizzeria.lng)
            ? `https://www.google.com/maps/dir/?api=1&destination=${pizzeria.lat},${pizzeria.lng}`
            : `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;
          const phoneValue = pizzeria.phone && pizzeria.phone !== 'Não informado' ? pizzeria.phone : 'Não informado';
          const phoneLink = phoneValue !== 'Não informado' ? `<a href="tel:${escapeHtml(phoneValue)}" class="text-blue-300 hover:underline">${escapeHtml(phoneValue)}</a>` : '<span class="text-gray-500">Não informado</span>';
          const instagramValue = pizzeria.instagram || 'Não informado';
          const instagramHtml = igLink ? `<a href="${escapeHtml(igLink)}" target="_blank" rel="noopener noreferrer" class="text-terracotta hover:underline">${escapeHtml(instagramValue)}</a>` : `<span class="text-gray-500">${escapeHtml(instagramValue)}</span>`;
          const hours = getPizzeriaHours(pizzeria);
          const status = getPizzeriaStatus(pizzeria, hours);
          const statusClass = status === 'Aberta agora' ? 'text-emerald-300' : status === 'Fechada agora' ? 'text-red-300' : 'text-gray-300';
          const hoursHtml = hours.length
            ? hours.map(row => `<div class="flex justify-between gap-3 border-b border-gray-800 py-2 last:border-0"><span class="text-gray-400">${escapeHtml(row.day)}</span><span class="text-cream text-right">${escapeHtml(row.value)}</span></div>`).join('')
            : '<p class="text-sm text-gray-400">Horários ainda não cadastrados.</p>';
          const gallery = getPizzeriaGallery(pizzeria);
          const features = getPizzeriaFeatures(pizzeria);
          const menuLink = getPizzeriaMenuLink(pizzeria);
          const history = getPizzeriaHistory(pizzeria);
          const hasCoordinates = Number.isFinite(Number(pizzeria.lat)) && Number.isFinite(Number(pizzeria.lng));
          const isCompared = compareIds.has(String(pizzeria.id));
          const pizzeriaKey = String(pizzeria.id);
          const personalNote = personalNotes[pizzeriaKey] || '';
          const shareText = `${pizzeria.name} — ${pizzeria.addressPt || pizzeria.address || ''}`;
          const shareUrl = window.location.href;
          const whatsappLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
          const emailValue = pizzeria.email || pizzeria.emailAddress || pizzeria.email_address || '';
          const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(emailValue).trim());
          const emailLink = hasValidEmail ? `mailto:${String(emailValue).trim()}?subject=${encodeURIComponent(`Pizzaria AVPN: ${pizzeria.name}`)}&body=${encodeURIComponent(`${shareText}\n${shareUrl}`)}` : '';
          const hoursSourceLink = `<a href="${escapeHtml(mapLink)}" target="_blank" rel="noopener noreferrer" class="text-blue-300 hover:underline">Ver horários no Google Maps</a>`;
          const sourceLinks = [
            pizzeria.avpnUrl ? `<a href="${escapeHtml(pizzeria.avpnUrl)}" target="_blank" rel="noopener noreferrer">Ficha oficial AVPN</a>` : '',
            `<a href="${escapeHtml(mapLink)}" target="_blank" rel="noopener noreferrer">Google Maps</a>`,
            igLink ? `<a href="${escapeHtml(igLink)}" target="_blank" rel="noopener noreferrer">Instagram</a>` : ''
          ].filter(Boolean);
          const missingFields = [
            !hours.length ? 'horários' : '', !gallery.length ? 'logo/fotos' : '', !menuLink ? 'cardápio' : '', !history.length ? 'histórico' : '', !hasGoogleRating ? 'avaliação Google' : ''
          ].filter(Boolean);
          const comparedPizzerias = pizzeriasData.filter(item => compareIds.has(String(item.id)));
          const comparisonTable = comparedPizzerias.length > 1
            ? `<div class="overflow-x-auto"><table class="w-full text-xs text-left"><thead><tr class="border-b border-gray-700"><th class="p-2 text-gray-500">Critério</th>${comparedPizzerias.map(item => `<th class="p-2 text-gold">${escapeHtml(item.name)}</th>`).join('')}</tr></thead><tbody>${[
              ['País', item => item.countryPt], ['Cidade', item => item.cityPt], ['Estado / província', item => item.statePt], ['Avaliação Google', item => item.googleRating || item.rating ? `${item.googleRating || item.rating} / 5` : 'Não cadastrada'], ['Telefone', item => item.phone || 'Não informado'], ['Endereço', item => item.addressPt]
            ].map(([label, getter]) => `<tr class="border-b border-gray-800"><td class="p-2 text-gray-400">${label}</td>${comparedPizzerias.map(item => `<td class="p-2 text-cream">${escapeHtml(getter(item) || 'Não informado')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
            : '<p class="text-sm text-gray-400">Adicione pelo menos mais uma pizzaria para visualizar a comparação.</p>';
          const featureHtml = [
            'Associada à AVPN',
            pizzeria.address ? 'Endereço cadastrado' : '',
            phoneValue !== 'Não informado' ? 'Telefone cadastrado' : '',
            igLink ? 'Instagram cadastrado' : '',
            pizzeria.avpnUrl ? 'Ficha oficial disponível' : '',
            ...features
          ].filter(Boolean).map(value => `<span class="detail-feature-chip">${escapeHtml(value)}</span>`).join('');
          const ratingStars = hasGoogleRating ? '★★★★★'.slice(0, Math.max(0, Math.min(5, Math.round(Number(googleRating))))).padEnd(5, '☆') : '☆☆☆☆☆';
          const ratingDetailsHtml = hasGoogleRating
            ? `<div class="detail-rating-score"><span class="detail-rating-stars">${ratingStars}</span><strong>${escapeHtml(Number(googleRating).toFixed(1))}</strong><span class="text-gray-500">/ 5</span></div>${googleReviews ? `<p class="text-sm text-gray-300 mt-1">${escapeHtml(googleReviews)} avaliações no Google</p>` : ''}${googleUpdatedAt ? `<p class="text-[11px] text-gray-500 mt-1">Atualizado em ${escapeHtml(googleUpdatedAt)}</p>` : ''}${googleSummary ? `<p class="text-sm text-gray-300 mt-3">${escapeHtml(googleSummary)}</p>` : ''}${googleHighlights.length ? `<div class="flex flex-wrap gap-2 mt-3">${googleHighlights.slice(0, 6).map(value => `<span class="detail-feature-chip">${escapeHtml(value)}</span>`).join('')}</div>` : ''}`
            : '<p class="text-sm text-gray-400">A nota e o resumo das avaliações ainda não estão cadastrados. Consulte a fonte atual no Google Maps.</p>';
          const galleryHtml = gallery.length
            ? gallery.map((url, index) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="detail-gallery-item"><img src="${escapeHtml(url)}" alt="${index === 0 ? `Logo ou imagem de ${escapeHtml(pizzeria.name)}` : `Imagem ${index + 1} de ${escapeHtml(pizzeria.name)}`}" loading="lazy" onerror="this.closest('a').remove()"></a>`).join('')
            : '<div class="detail-gallery-empty"><strong>Fotos e logo ainda não cadastrados</strong><small>Quando houver imagens oficiais, elas aparecerão aqui.</small></div>';

          detailContent.innerHTML = `
            <div class="detail-hero bg-charcoalCard p-5 sm:p-7 rounded-xl border border-terracotta/40">
              <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                <div>
                  <button type="button" id="directory-detail-back" class="text-xs text-gold hover:text-cream mb-4 inline-flex items-center gap-1">← Voltar ao diretório</button>
                  <div class="flex items-start gap-3 mb-3">
                    ${logoHtml}
                    <div>
                      <div class="flex flex-wrap items-center gap-2 mb-2">
                        <span class="text-[10px] font-mono font-bold bg-gold/20 text-gold px-2 py-1 rounded border border-gold/30">AVPN #${escapeHtml(pizzeria.id)}</span>
                        <span class="text-xs text-gray-400">${escapeHtml(pizzeria.countryPt)} · ${escapeHtml(pizzeria.cityPt)}</span>
                      </div>
                      <h2 class="text-2xl sm:text-3xl font-bold text-cream">${escapeHtml(pizzeria.name)}</h2>
                    </div>
                  </div>
                  <p class="mt-2 text-sm text-gold/90">${escapeHtml(pizzeria.addressPt)}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button type="button" id="directory-detail-favorite" class="px-3 py-2 rounded border border-gold/40 bg-charcoal text-gold text-xs font-semibold hover:bg-gold/10">${isFavorite ? '★ Remover dos favoritos' : '☆ Adicionar aos favoritos'}</button>
                  <button type="button" id="directory-detail-compare" class="px-3 py-2 rounded border border-blue-400/40 bg-charcoal text-blue-300 text-xs font-semibold hover:bg-blue-900/20">${isCompared ? '✓ Remover da comparação' : '+ Comparar'} (${compareIds.size}/3)</button>
                  <a href="${escapeHtml(mapLink)}" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded bg-terracotta text-cream text-xs font-semibold hover:bg-terracotta/80">Abrir no Google Maps</a>
                </div>
              </div>
              <div class="detail-summary-grid mt-5">
                <div class="detail-summary-item"><span class="detail-summary-label">Avaliação Google</span><strong>${hasGoogleRating ? `${escapeHtml(Number(googleRating).toFixed(1))} / 5` : 'Consultar no Maps'}</strong><span>${googleReviews ? `${escapeHtml(googleReviews)} avaliações` : 'Nota não cadastrada'}</span><a href="${escapeHtml(mapLink)}" target="_blank" rel="noopener noreferrer">Ver avaliação</a></div>
                <div class="detail-summary-item"><span class="detail-summary-label">Funcionamento</span><strong class="${statusClass}">${escapeHtml(status)}</strong><span>${hours.length ? 'Dados cadastrados' : 'Fonte: Google Maps'}</span>${hours.length ? '' : hoursSourceLink}</div>
                <div class="detail-summary-item"><span class="detail-summary-label">Localização</span><strong>${escapeHtml(pizzeria.cityPt)}</strong><span>${escapeHtml(pizzeria.countryPt)}</span></div>
                <div class="detail-summary-item"><span class="detail-summary-label">Contato</span><strong>${phoneValue !== 'Não informado' ? phoneLink : 'Não informado'}</strong>${igLink ? `<a href="${escapeHtml(igLink)}" target="_blank" rel="noopener noreferrer">Abrir Instagram</a>` : '<span>Sem Instagram cadastrado</span>'}</div>
              </div>
              <div class="detail-location-panel mt-4">
                <div><span class="detail-summary-label">Localização e acesso</span><strong>${escapeHtml(pizzeria.addressPt)}</strong><span>${hasCoordinates ? 'Coordenadas cadastradas' : 'Endereço cadastrado'}</span></div>
                <div class="flex flex-wrap gap-2"><button type="button" id="directory-copy-address" class="detail-action-button">Copiar endereço</button><button type="button" id="directory-share-pizzeria" class="detail-action-button">Compartilhar ficha</button><a href="${escapeHtml(whatsappLink)}" target="_blank" rel="noopener noreferrer" class="detail-action-button">WhatsApp</a>${hasValidEmail ? `<a href="${escapeHtml(emailLink)}" class="detail-action-button">E-mail</a>` : '<span class="detail-action-button detail-action-disabled">E-mail não cadastrado</span>'}<button type="button" id="directory-distance-btn" class="detail-action-button">Calcular distância</button></div>
                <span id="directory-distance-result" class="text-xs text-gray-400">${hasCoordinates ? 'A distância será calculada com a sua localização, mediante autorização.' : 'Distância indisponível: a base ainda não possui coordenadas.'}</span>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div class="lg:col-span-2 bg-charcoalCard p-5 rounded-xl border border-gray-800 space-y-4">
                <h3 class="text-base font-semibold text-gold border-b border-gray-800 pb-2">Informações da pizzaria</h3>
                <div class="bg-charcoal rounded border border-gold/30 p-3">
                  <span class="block text-[10px] uppercase tracking-wide text-gray-500">Avaliação atual no Google</span>
                  <div class="flex items-center gap-2 mt-1 text-sm">${googleRatingHtml}</div>
                  <div class="mt-3">${ratingDetailsHtml}</div>
                  <a href="${escapeHtml(mapLink)}" target="_blank" rel="noopener noreferrer" class="inline-block mt-2 text-[11px] text-blue-300 hover:underline">Abrir Google Maps e conferir a nota atual</a>
                </div>
                <div>
                  <h4 class="text-[10px] uppercase tracking-wide text-gray-500 mb-2">Principais características cadastradas</h4>
                  <div class="flex flex-wrap gap-2">${featureHtml || '<span class="text-sm text-gray-400">Características adicionais ainda não cadastradas.</span>'}</div>
                </div>
                <dl class="detail-info-list space-y-3 text-sm">
                  <div><dt class="text-[10px] uppercase tracking-wide text-gray-500">Nome</dt><dd class="text-cream mt-0.5">${escapeHtml(pizzeria.name)}</dd></div>
                  <div><dt class="text-[10px] uppercase tracking-wide text-gray-500">ID AVPN</dt><dd class="text-cream mt-0.5">#${escapeHtml(pizzeria.id)}</dd></div>
                  <div><dt class="text-[10px] uppercase tracking-wide text-gray-500">País</dt><dd class="text-cream mt-0.5">${escapeHtml(pizzeria.countryPt)} <span class="text-gray-500">(${escapeHtml(pizzeria.country)})</span></dd></div>
                  <div><dt class="text-[10px] uppercase tracking-wide text-gray-500">Cidade</dt><dd class="text-cream mt-0.5">${escapeHtml(pizzeria.cityPt)} <span class="text-gray-500">(${escapeHtml(pizzeria.city)})</span></dd></div>
                  <div><dt class="text-[10px] uppercase tracking-wide text-gray-500">Estado / província</dt><dd class="text-cream mt-0.5">${escapeHtml(pizzeria.statePt)}</dd></div>
                  <div><dt class="text-[10px] uppercase tracking-wide text-gray-500">Endereço traduzido</dt><dd class="text-cream mt-0.5">${escapeHtml(pizzeria.addressPt)}</dd></div>
                  <div><dt class="text-[10px] uppercase tracking-wide text-gray-500">Endereço original</dt><dd class="text-gray-400 mt-0.5 italic">${escapeHtml(pizzeria.address)}</dd></div>
                </dl>
                <div class="border-t border-gray-800 pt-4">
                  <h3 class="text-base font-semibold text-gold mb-2">Horário de funcionamento</h3>
                  <div class="mb-2 flex items-center gap-2 text-sm"><span class="detail-status-dot ${status === 'Aberta agora' ? 'is-open' : status === 'Fechada agora' ? 'is-closed' : ''}"></span><strong class="${statusClass}">${escapeHtml(status)}</strong></div>
                  <div class="text-xs">${hoursHtml}</div>
                  <a href="${escapeHtml(mapLink)}" target="_blank" rel="noopener noreferrer" class="inline-block mt-3 text-[11px] text-blue-300 hover:underline">Consultar horários atualizados no Google Maps</a>
                </div>
              </div>

              <div class="lg:col-span-3 bg-charcoalCard p-5 rounded-xl border border-gray-800 space-y-4">
                <h3 class="text-base font-semibold text-gold border-b border-gray-800 pb-2">Contato e referências</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div class="bg-charcoal rounded border border-gray-800 p-3"><span class="block text-[10px] uppercase tracking-wide text-gray-500">Telefone</span><span class="text-cream">${phoneLink}</span></div>
                  <div class="bg-charcoal rounded border border-gray-800 p-3"><span class="block text-[10px] uppercase tracking-wide text-gray-500">Instagram</span><span>${instagramHtml}</span></div>
                </div>
                <div class="flex flex-wrap gap-2 pt-1">
                  <a href="${escapeHtml(pizzeria.avpnUrl)}" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded border border-gold/40 text-gold text-xs font-semibold hover:bg-gold/10">Ficha oficial AVPN</a>
                  <a href="${escapeHtml(routeLink)}" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded border border-blue-400/40 text-blue-300 text-xs font-semibold hover:bg-blue-900/20">Traçar rota</a>
                  ${menuLink ? `<a href="${escapeHtml(menuLink)}" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded border border-emerald-400/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-900/20">Ver cardápio</a>` : ''}
                </div>
                <div class="bg-charcoal rounded border border-gray-800 p-3 text-sm"><span class="block text-[10px] uppercase tracking-wide text-gray-500">Cardápio</span>${menuLink ? '<span class="text-emerald-300">Cardápio oficial disponível no link acima.</span>' : '<span class="text-gray-400">Cardápio oficial não cadastrado.</span>'}</div>
                <div class="overflow-hidden rounded-lg border border-gray-800 bg-charcoal h-64 sm:h-80">
                  <iframe title="Mapa de ${escapeHtml(pizzeria.name)}" width="100%" height="100%" frameborder="0" loading="lazy" src="https://maps.google.com/maps?q=${mapQuery}&t=m&z=16&output=embed"></iframe>
                </div>
                <p class="text-[11px] text-gray-500">As informações exibidas vêm da base AVPN carregada no diretório. Use os links oficiais para consultar atualizações diretamente nas fontes.</p>
              </div>
            </div>
            <section class="bg-charcoalCard p-5 rounded-xl border border-gray-800 space-y-4">
              <div><h3 class="text-base font-semibold text-gold">História e reconhecimento</h3><p class="text-xs text-gray-400 mt-1">Informações históricas e institucionais confirmadas no cadastro.</p></div>
              ${history.length ? `<div class="detail-history-grid">${history.map(([label, value]) => `<div class="detail-history-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>` : '<p class="text-sm text-gray-400">História, fundação, responsáveis e prêmios ainda não cadastrados.</p>'}
            </section>
            <section class="bg-charcoalCard p-5 rounded-xl border border-gray-800 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2"><div><h3 class="text-base font-semibold text-gold">Comparar pizzarias</h3><p class="text-xs text-gray-400 mt-1">Selecione até três pizzarias no diretório para comparar informações lado a lado.</p></div><span class="text-xs text-gray-500">${compareIds.size}/3 selecionadas</span></div>
              ${comparisonTable}
            </section>
            <section class="bg-charcoalCard p-5 rounded-xl border border-gray-800 space-y-3">
              <div><h3 class="text-base font-semibold text-gold">Minha anotação</h3><p class="text-xs text-gray-400 mt-1">Anotação privada salva somente neste navegador.</p></div>
              <textarea id="directory-personal-note" rows="3" maxlength="1000" class="w-full bg-charcoal border border-gray-700 rounded-lg p-3 text-sm text-cream outline-none focus:border-gold" placeholder="Ex.: experimentar a Margherita e reservar para sexta-feira...">${escapeHtml(personalNote)}</textarea>
              <span id="directory-note-status" class="text-[11px] text-gray-500">${personalNote ? 'Anotação salva neste dispositivo.' : 'Nenhuma anotação salva.'}</span>
            </section>
            <section class="bg-charcoalCard p-5 rounded-xl border border-gray-800 space-y-3">
              <div><h3 class="text-base font-semibold text-gold">Fontes e atualização dos dados</h3><p class="text-xs text-gray-400 mt-1">Use as fontes abaixo para confirmar informações que podem mudar.</p></div>
              <div class="flex flex-wrap gap-2 text-xs">${sourceLinks.join(' · ')}</div>
              <div class="detail-trust-box"><strong>Origem principal:</strong> cadastro AVPN carregado no diretório.<br><strong>Última atualização da base:</strong> ${escapeHtml(pizzeria.dataUpdatedAt || pizzeria.updatedAt || 'não informada no registro')}<br><strong>Ainda não confirmado neste registro:</strong> ${escapeHtml(missingFields.length ? missingFields.join(', ') : 'nenhum campo pendente')}</div>
            </section>
            <section class="bg-charcoalCard p-5 rounded-xl border border-gray-800">
              <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
                <div><h3 class="text-base font-semibold text-gold">Galeria de fotos e logo</h3><p class="text-xs text-gray-400 mt-1">Imagens oficiais cadastradas para esta pizzaria.</p></div>
                <span class="text-[11px] text-gray-500">${gallery.length ? `${gallery.length} imagem(ns)` : 'Sem imagens cadastradas'}</span>
              </div>
              <div class="detail-gallery-grid">${galleryHtml}</div>
            </section>
          `;

          detailView.classList.remove('hidden');
          document.getElementById('directory-detail-back').addEventListener('click', closePizzeriaDetail);
          document.getElementById('directory-detail-favorite').addEventListener('click', () => window.togglePizzeriaFavorite(pizzeria.id));
          document.getElementById('directory-detail-compare').addEventListener('click', () => window.togglePizzeriaCompare(pizzeria.id, !isCompared));
          document.getElementById('directory-copy-address').addEventListener('click', async event => {
            try { await navigator.clipboard.writeText(pizzeria.addressPt || pizzeria.address || destinationText); event.target.textContent = 'Endereço copiado'; } catch (error) { event.target.textContent = 'Selecione e copie o endereço'; }
          });
          document.getElementById('directory-share-pizzeria').addEventListener('click', async event => {
            const shareData = { title: pizzeria.name, text: `${pizzeria.name} — ${pizzeria.addressPt}`, url: window.location.href };
            try { if (navigator.share) await navigator.share(shareData); else { await navigator.clipboard.writeText(window.location.href); event.target.textContent = 'Link copiado'; } } catch (error) {}
          });
          document.getElementById('directory-personal-note').addEventListener('input', event => {
            personalNotes[pizzeriaKey] = event.target.value.slice(0, 1000);
            try { localStorage.setItem(notesKey, JSON.stringify(personalNotes)); } catch (error) {}
            document.getElementById('directory-note-status').textContent = event.target.value.trim() ? 'Anotação salva neste dispositivo.' : 'Nenhuma anotação salva.';
          });
          document.getElementById('directory-distance-btn').addEventListener('click', () => {
            const result = document.getElementById('directory-distance-result');
            if (!hasCoordinates) { result.textContent = 'Inclua latitude e longitude no cadastro para calcular a distância.'; return; }
            if (!navigator.geolocation) { result.textContent = 'Seu navegador não oferece geolocalização.'; return; }
            result.textContent = 'Solicitando sua localização…';
            navigator.geolocation.getCurrentPosition(position => {
              const km = calculateDistanceKm(position.coords.latitude, position.coords.longitude, Number(pizzeria.lat), Number(pizzeria.lng));
              result.textContent = `Distância em linha reta: ${formatDistance(km)}.`;
            }, () => { result.textContent = 'Não foi possível obter sua localização. Verifique a permissão do navegador.'; }, { enableHighAccuracy: false, timeout: 10000 });
          });
        }

        function closePizzeriaDetail() {
          setDirectoryDetailVisible(false);
          if (window.history && window.history.pushState) window.history.pushState(null, null, '#aba5');
          window.scrollTo({ top: document.getElementById('aba5').offsetTop - 20, behavior: 'smooth' });
        }

        window.openPizzeriaDetail = function(id) {
          const found = pizzeriasData.find(p => String(p.id) === String(id));
          if (!found) return;
          selectedPizzeria = found;
          updateMapIframe(found);
          renderPizzeriaDetail(found);
          setDirectoryDetailVisible(true);
          if (window.history && window.history.pushState) window.history.pushState(null, null, `#aba5/pizzaria/${encodeURIComponent(found.id)}`);
          window.scrollTo({ top: document.getElementById('aba5').offsetTop - 20, behavior: 'smooth' });
        };

        function updateMapIframe(pizzeria) {
          if (!pizzeria) return;
          selectedPizzeria = pizzeria;
          mapTitle.textContent = `Selecionado: ${pizzeria.name} — ${pizzeria.cityPt}, ${pizzeria.countryPt}`;

          const mode = mapSatelliteMode ? 'k' : 'm';
          const destinationText = `${pizzeria.name}, ${pizzeria.address}, ${pizzeria.country}`;
          const query = encodeURIComponent(destinationText);
          iframe.src = `https://maps.google.com/maps?q=${query}&t=${mode}&z=16&output=embed`;

          // Usa lat/lng se existir, senão usa o endereço completo para traçar rota
          const destParam = (pizzeria.lat && pizzeria.lng)
            ? `${pizzeria.lat},${pizzeria.lng}`
            : query;
          routeBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${destParam}`;
        }

        function populateFilters() {
          const countries = Array.from(new Set(pizzeriasData.map(p => p.countryPt))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
          countryFilter.innerHTML = '<option value="ALL">Todos os Países</option>' +
            countries.map(c => `<option value="${c}">${c}</option>`).join('');

          populateLocationFilters();
        }

        function populateLocationFilters() {
          const selectedCountry = countryFilter.value;
          const selectedState = stateFilter.value;
          let filtered = pizzeriasData;
          if (selectedCountry !== 'ALL') {
            filtered = pizzeriasData.filter(p => p.countryPt === selectedCountry);
          }
          if (selectedState !== 'ALL') {
            filtered = filtered.filter(p => p.statePt === selectedState);
          }

          const previousCity = cityFilter.value;
          const cities = Array.from(new Set(filtered.map(p => p.cityPt))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
          cityFilter.innerHTML = '<option value="ALL">Todas as Cidades</option>' +
            cities.map(c => `<option value="${c}">${c}</option>`).join('');
          if (cities.includes(previousCity)) cityFilter.value = previousCity;

          const states = Array.from(new Set(filtered.map(p => p.statePt))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
          const currentState = stateFilter.value;
          stateFilter.innerHTML = '<option value="ALL">Todos os Estados / Províncias</option>' +
            states.map(state => `<option value="${state}">${state}</option>`).join('');
          if (states.includes(currentState)) stateFilter.value = currentState;
        }

        function renderCards() {
          const term = normalizeFilterText(searchInput.value);
          const countryVal = countryFilter.value;
          const cityVal = cityFilter.value;
          const stateVal = stateFilter.value;
          const favoritesVal = favoritesFilter.value;

          const filtered = pizzeriasData.filter(p => {
            const searchable = [p.name, p.id, p.addressPt, p.address, p.cityPt, p.statePt, p.countryPt]
              .map(normalizeFilterText).join(' ');
            const matchesSearch = searchable.includes(term);
            const matchesCountry = countryVal === 'ALL' || p.countryPt === countryVal;
            const matchesCity = cityVal === 'ALL' || p.cityPt === cityVal;
            const matchesState = stateVal === 'ALL' || p.statePt === stateVal;
            const matchesFavorite = favoritesVal !== 'FAVORITES' || favoriteIds.has(String(p.id));
            return matchesSearch && matchesCountry && matchesCity && matchesState && matchesFavorite;
          });

          const sortValue = sortFilter.value;
          filtered.sort((a, b) => {
            if (sortValue === 'id') return Number(a.id) - Number(b.id);
            const field = sortValue === 'city' ? 'cityPt' : sortValue === 'country' ? 'countryPt' : 'name';
            return String(a[field] || '').localeCompare(String(b[field] || ''), 'pt-BR');
          });

          // Paginação
          const totalItems = filtered.length;
          const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
          if (currentPage > totalPages) currentPage = totalPages;

          const startIdx = (currentPage - 1) * itemsPerPage;
          const pageItems = filtered.slice(startIdx, startIdx + itemsPerPage);

          let html = '';
          if (pageItems.length === 0) {
            html = '<div class="col-span-3 text-center py-8 text-gray-500">Nenhuma pizzaria encontrada com estes filtros.</div>';
          } else {
            pageItems.forEach(p => {
              const isSelected = selectedPizzeria && selectedPizzeria.id === p.id;
              const isFavorite = favoriteIds.has(String(p.id));
              const isCompared = compareIds.has(String(p.id));
              const igLink = p.instagramUrl || (p.instagram ? `https://instagram.com/${p.instagram.replace('@', '')}` : '');
              const igHtml = igLink
                ? `<a href="${igLink}" target="_blank" rel="noopener noreferrer" class="text-terracotta hover:underline font-semibold truncate max-w-[140px]">${p.instagram || 'Instagram'}</a>`
                : `<span class="text-gray-600 text-[11px]">Sem Instagram</span>`;

              const phoneHtml = (p.phone && p.phone !== 'Não informado')
                ? `<span>📞 <a href="tel:${p.phone}" class="hover:underline">${p.phone}</a></span>`
                : `<span class="text-gray-500">📞 Não informado</span>`;

              html += `
                <div data-pizzeria-id="${p.id}" role="link" tabindex="0" aria-label="Abrir detalhes de ${escapeHtml(p.name)}" class="pizzeria-card bg-charcoalCard p-5 rounded-xl border ${isSelected ? 'border-terracotta ring-1 ring-terracotta' : 'border-gray-800'} hover:border-gold/40 transition flex flex-col justify-between space-y-3 cursor-pointer">
                  <div>
                    <div class="flex justify-between items-start gap-2">
                      <span class="text-[10px] font-mono font-bold bg-gold/20 text-gold px-2 py-0.5 rounded border border-gold/30">AVPN #${p.id}</span>
                      <div class="flex items-center gap-2"><span class="text-xs text-gray-400 font-medium">${p.countryPt}</span><button type="button" onclick="window.togglePizzeriaFavorite('${p.id}')" class="text-base ${isFavorite ? 'text-gold' : 'text-gray-600'} hover:text-gold" title="${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">${isFavorite ? '★' : '☆'}</button></div>
                    </div>
                    <h3 class="font-bold text-cream text-base mt-2">${p.name}</h3>
                    
                    <!-- Endereço Traduzido -->
                    <p class="text-xs text-gold/90 font-medium mt-1">${p.addressPt}</p>
                    <p class="text-[11px] text-gray-400 mt-1">Estado / província: <span class="text-gray-300">${p.statePt}</span></p>
                    <!-- Endereço Original Referência -->
                    <p class="text-[10px] text-gray-500 italic mt-0.5">Orig: ${p.address}</p>
                  </div>

                  <div class="pt-3 border-t border-gray-800 space-y-2">
                    <div class="flex justify-between items-center text-xs text-gray-300 gap-2">
                      ${phoneHtml}
                      ${igHtml}
                    </div>

                    <div class="flex gap-2 pt-1">
                      <button type="button" onclick="window.focusPizzeria('${p.id}')" class="flex-1 px-2.5 py-1.5 bg-terracotta hover:bg-terracotta/80 text-cream text-xs font-semibold rounded text-center transition">
                        Ver no Google Maps
                      </button>
                      <button type="button" onclick="window.openPizzeriaDetail('${p.id}')" class="flex-1 px-2.5 py-1.5 bg-gold/10 hover:bg-gold/20 border border-gold/40 text-gold text-xs font-semibold rounded text-center transition">
                        Ver detalhes
                      </button>
                      <a href="${p.avpnUrl}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1.5 bg-charcoal hover:bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded text-center">
                        Ficha AVPN
                      </a>
                    </div>
                    <label class="flex items-center gap-2 text-[11px] text-gray-400 cursor-pointer"><input type="checkbox" ${isCompared ? 'checked' : ''} onchange="window.togglePizzeriaCompare('${p.id}', this.checked)" class="accent-terracotta"> Comparar esta pizzaria</label>
                  </div>
                </div>
              `;
            });
          }

          cardsGrid.innerHTML = html;
          paginationInfo.textContent = `Exibindo ${totalItems > 0 ? startIdx + 1 : 0}-${Math.min(startIdx + itemsPerPage, totalItems)} de ${totalItems} pizzarias`;
          btnPrev.disabled = currentPage === 1;
          btnNext.disabled = currentPage === totalPages;
          renderComparePanel();
        }

        function renderComparePanel() {
          const selected = pizzeriasData.filter(p => compareIds.has(String(p.id)));
          compareList.innerHTML = selected.length
            ? selected.map(p => `<span class="px-2 py-1 rounded bg-gold/10 border border-gold/30 text-gold">${p.name} <button type="button" onclick="window.togglePizzeriaCompare('${p.id}', false)" class="ml-1 text-gray-400 hover:text-white">×</button></span>`).join('')
            : '<span>Nenhuma pizzaria selecionada para comparação.</span>';
          if (!selected.length) { compareResult.classList.add('hidden'); compareResult.innerHTML = ''; return; }
          compareResult.classList.remove('hidden');
          compareResult.innerHTML = `<table class="w-full text-xs text-left"><thead><tr class="border-b border-gray-700 text-gray-500 uppercase"><th class="p-2">Campo</th>${selected.map(p => `<th class="p-2 text-gold">${p.name}</th>`).join('')}</tr></thead><tbody>${[
            ['ID AVPN', p => p.id], ['País', p => p.countryPt], ['Estado / Província', p => p.statePt], ['Cidade', p => p.cityPt], ['Endereço', p => p.addressPt], ['Telefone', p => p.phone || 'Não informado'], ['Instagram', p => p.instagram || 'Não informado']
          ].map(([label, getter]) => `<tr class="border-b border-gray-800"><td class="p-2 text-gray-400">${label}</td>${selected.map(p => `<td class="p-2 text-cream">${getter(p) || 'Não informado'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        }

        window.togglePizzeriaFavorite = function(id) {
          const key = String(id);
          if (favoriteIds.has(key)) favoriteIds.delete(key); else favoriteIds.add(key);
          try { localStorage.setItem(favoritesKey, JSON.stringify([...favoriteIds])); } catch (error) {}
          renderCards();
          if (!detailView.classList.contains('hidden') && selectedPizzeria && String(selectedPizzeria.id) === key) renderPizzeriaDetail(selectedPizzeria);
        };

        window.togglePizzeriaCompare = function(id, shouldAdd) {
          const key = String(id);
          if (shouldAdd) {
            if (compareIds.size >= 3 && !compareIds.has(key)) { window.alert('É possível comparar até três pizzarias.'); renderCards(); return; }
            compareIds.add(key);
          } else compareIds.delete(key);
          renderCards();
          if (!detailView.classList.contains('hidden') && selectedPizzeria) renderPizzeriaDetail(selectedPizzeria);
        };

        document.getElementById('directory-validate-btn').addEventListener('click', () => {
          const duplicateIds = pizzeriasData.filter((p, index, all) => all.findIndex(other => String(other.id) === String(p.id)) !== index).map(p => p.id);
          const withoutAddress = pizzeriasData.filter(p => !p.address || p.address === 'Não informado');
          const withoutPhone = pizzeriasData.filter(p => !p.phone || p.phone === 'Não informado');
          const withoutState = pizzeriasData.filter(p => !p.statePt || p.statePt === 'Não informado');
          const withoutMap = pizzeriasData.filter(p => !p.lat || !p.lng);
          validationResult.classList.remove('hidden');
          validationResult.innerHTML = `<strong class="text-gold">Auditoria local da base:</strong><ul class="mt-2 space-y-1"><li>Registros analisados: ${pizzeriasData.length}</li><li>IDs duplicados: ${new Set(duplicateIds).size}</li><li>Sem endereço: ${withoutAddress.length}</li><li>Sem telefone: ${withoutPhone.length}</li><li>Sem estado / província identificado: ${withoutState.length}</li><li>Sem coordenadas geográficas: ${withoutMap.length}</li></ul>`;
        });

        window.focusPizzeria = function(id) {
          const found = pizzeriasData.find(p => p.id === id);
          if (found) {
            updateMapIframe(found);
            renderCards();
            window.scrollTo({ top: iframe.offsetTop - 100, behavior: 'smooth' });
          }
        };

        cardsGrid.addEventListener('click', event => {
          if (event.target.closest('a, button, input, label')) return;
          const card = event.target.closest('[data-pizzeria-id]');
          if (card) window.openPizzeriaDetail(card.dataset.pizzeriaId);
        });
        cardsGrid.addEventListener('keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          if (event.target.closest('a, button, input, label')) return;
          const card = event.target.closest('[data-pizzeria-id]');
          if (card) {
            event.preventDefault();
            window.openPizzeriaDetail(card.dataset.pizzeriaId);
          }
        });

        // Eventos
        searchInput.addEventListener('input', () => { currentPage = 1; renderCards(); });
        countryFilter.addEventListener('change', () => {
          currentPage = 1;
          stateFilter.value = 'ALL';
          cityFilter.value = 'ALL';
          populateLocationFilters();
          renderCards();
        });
        cityFilter.addEventListener('change', () => { currentPage = 1; renderCards(); });
        stateFilter.addEventListener('change', () => { currentPage = 1; populateLocationFilters(); renderCards(); });
        sortFilter.addEventListener('change', () => { currentPage = 1; renderCards(); });
        favoritesFilter.addEventListener('change', () => { currentPage = 1; renderCards(); });
        clearFiltersBtn.addEventListener('click', () => {
          searchInput.value = '';
          countryFilter.value = 'ALL';
          stateFilter.value = 'ALL';
          cityFilter.value = 'ALL';
          sortFilter.value = 'name';
          favoritesFilter.value = 'ALL';
          currentPage = 1;
          populateLocationFilters();
          renderCards();
        });

        btnPrev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderCards(); } });
        btnNext.addEventListener('click', () => { currentPage++; renderCards(); });

        document.getElementById('map-mode-toggle').addEventListener('click', function() {
          mapSatelliteMode = !mapSatelliteMode;
          this.textContent = mapSatelliteMode ? 'Modo: Vetorial' : 'Modo: Satélite';
          updateMapIframe(selectedPizzeria);
        });

        // Inicializa
        populateFilters();
        updateMapIframe(selectedPizzeria);
        renderCards();
      })();
    } catch (err) {
      console.error('Erro no módulo de pizzarias e mapas:', err);
    }

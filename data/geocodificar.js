const fs = require('fs');

// Lê o arquivo pizzerias.js e extrai o array AVPN_DATABASE
const rawContent = fs.readFileSync('pizzerias.js', 'utf8');
const jsonMatch = rawContent.match(/const AVPN_DATABASE = (\[[\s\S]*\]);/);
const pizzerias = JSON.parse(jsonMatch[1]);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function buscarCoordenadas() {
  for (let i = 0; i < pizzerias.length; i++) {
    const p = pizzerias[i];
    const query = encodeURIComponent(`${p.address}, ${p.city}, ${p.country}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AVPN-Geocoder-Script/1.0' }
      });
      const data = await res.json();

      if (data && data.length > 0) {
        p.lat = parseFloat(data[0].lat);
        p.lng = parseFloat(data[0].lon);
        console.log(`[${i + 1}/${pizzerias.length}] OK: ${p.name} -> ${p.lat}, ${p.lng}`);
      } else {
        p.lat = null;
        p.lng = null;
        console.log(`[${i + 1}/${pizzerias.length}] NÃO ENCONTRADO: ${p.name}`);
      }
    } catch (err) {
      console.error(`Erro em ${p.name}:`, err.message);
    }

    // Respeita o limite de 1 requisição por segundo da API gratuita
    await delay(1100);
  }

  const output = `// Base AVPN adaptada do arquivo enviado; substitui somente data/pizzerias.js.
/* Base AVPN extraída do HTML monolítico, com estado/província/região preenchido quando ausente. */
const AVPN_DATABASE = ${JSON.stringify(pizzerias, null, 2)};\n`;

  fs.writeFileSync('pizzerias.js', output, 'utf8');
  console.log('Concluído! O arquivo pizzerias.js foi atualizado com as coordenadas.');
}

buscarCoordenadas();

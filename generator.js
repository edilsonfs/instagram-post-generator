const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const schedule = require('node-schedule');

// ==========================================
// CONFIGURACOES
// ==========================================
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;
const NICHO = process.env.NICHO || 'FINANCAS PESSOAIS';

// Criar pasta de output se nao existir
const OUTPUT_DIR = './output';
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ==========================================
// 1 GERAR TEMA COM OPENAI
// ==========================================
async function generateTheme() {
    console.log('Gerando tema...');

  try {
        const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
          {
                    model: 'gpt-4-turbo',
                    temperature: 0.8,
                    messages: [
                      {
                                    role: 'user',
                                    content: `Voce e um especialista em conteudo viral para Instagram.

                                                Gere 1 tema para um video educacional sobre ${NICHO}.

                                                Responda APENAS em JSON valido com estes campos:
                                                {
                                                  "tema": "Titulo em ate 10 palavras",
                                                    "descricao": "Uma descricao breve (20-30 palavras)",
                                                      "pontos_chave": ["Ponto 1", "Ponto 2", "Ponto 3"],
                                                        "hook": "Uma frase provocadora para abrir o video"
                                                        }`
                      }
                              ]
          },
          {
                    headers: {
                                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                                'Content-Type': 'application/json'
                    }
          }
              );

      const content = response.data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const tema = JSON.parse(jsonMatch[0]);

      console.log('Tema gerado:', tema.tema);
        return tema;
  } catch (error) {
        console.error('Erro ao gerar tema:', error.response?.data || error.message);
        throw error;
  }
}

// ==========================================
// 2 GERAR IMAGEM COM DALL-E
// ==========================================
async function generateImage(tema) {
    console.log('Gerando imagem com DALL-E...');

  try {
        const response = await axios.post(
                'https://api.openai.com/v1/images/generations',
          {
                    model: 'dall-e-3',
                    prompt: `Professional Instagram post image about ${tema.tema}. Modern style, vibrant colors, professional look, no text in image.`,
                    n: 1,
                    size: '1024x1024',
                    quality: 'hd'
          },
          {
                    headers: {
                                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                                'Content-Type': 'application/json'
                    }
          }
              );

      const imageUrl = response.data.data[0].url;
        console.log('Imagem gerada!');
        return imageUrl;
  } catch (error) {
        console.error('Erro ao gerar imagem:', error.response?.data || error.message);
        throw error;
  }
}

// ==========================================
// 3 DOWNLOAD DA IMAGEM
// ==========================================
async function downloadImage(imageUrl, filename) {
    console.log('Baixando imagem...');

  try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const filepath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, response.data);
        console.log(`Imagem salva em: ${filepath}`);
        return filepath;
  } catch (error) {
        console.error('Erro ao baixar imagem:', error.message);
        throw error;
  }
}

// ==========================================
// 4 GERAR LEGENDA VIRAL
// ==========================================
async function generateCaption(tema) {
    console.log('Gerando legenda...');

  try {
        const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
          {
                    model: 'gpt-4-turbo',
                    temperature: 0.8,
                    messages: [
                      {
                                    role: 'user',
                                    content: `Crie uma legenda VIRAL para Instagram Reel sobre: ${tema.tema}

                                    Formato:
                                    - Hook (frase que prende)
                                    - 3 pontos principais com emojis
                                    - Dica bonus
                                    - Call-to-action
                                    - 10 hashtags relevantes

                                    Retorne APENAS a legenda formatada.`
                      }
                              ]
          },
          {
                    headers: {
                                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                                'Content-Type': 'application/json'
                    }
          }
              );

      const caption = response.data.choices[0].message.content;
        console.log('Legenda criada!');
        return caption;
  } catch (error) {
        console.error('Erro ao gerar legenda:', error.response?.data || error.message);
        throw error;
  }
}

// ==========================================
// 5 SALVAR RESULTADOS
// ==========================================
function saveResults(tema, imageUrl, imagePath, caption) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  const results = {
        timestamp: new Date().toISOString(),
        tema: tema.tema,
        descricao: tema.descricao,
        pontos_chave: tema.pontos_chave,
        hook: tema.hook,
        imageUrl: imageUrl,
        imagePath: imagePath,
        caption: caption
  };

  const jsonPath = path.join(OUTPUT_DIR, `post_${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    console.log(`JSON salvo em: ${jsonPath}`);

  const txtPath = path.join(OUTPUT_DIR, `legenda_${timestamp}.txt`);
    fs.writeFileSync(txtPath, caption);
    console.log(`Legenda salva em: ${txtPath}`);

  return results;
}

// ==========================================
// 6 FUNCAO PRINCIPAL
// ==========================================
async function generatePost() {
    console.log('\n');
    console.log('=============================================');
    console.log('   INSTAGRAM POST GENERATOR - Powered by AI');
    console.log('=============================================');
    console.log(`Data: ${new Date().toLocaleString('pt-BR')}`);
    console.log(`Nicho: ${NICHO}`);
    console.log('=============================================\n');

  try {
        const tema = await generateTheme();
        console.log('');

      const imageUrl = await generateImage(tema);
        console.log('');

      const timestamp = Date.now();
        const imagePath = await downloadImage(imageUrl, `imagem_${timestamp}.png`);
        console.log('');

      const caption = await generateCaption(tema);
        console.log('');

      const results = saveResults(tema, imageUrl, imagePath, caption);
        console.log('');

      console.log('=============================================');
        console.log('POST GERADO COM SUCESSO!');
        console.log('=============================================');
        console.log('');
        console.log('RESUMO:');
        console.log(`   Tema: ${results.tema}`);
        console.log(`   Imagem: ${results.imagePath}`);
        console.log('');
        console.log('Arquivos salvos na pasta: ./output/');
        console.log('');

      return results;
  } catch (error) {
        console.error('\nERRO GERAL:', error.message);
        process.exit(1);
  }
}

// ==========================================
// 7 AGENDADOR DIARIO
// ==========================================
function scheduleDaily() {
    const hora = process.env.SCHEDULE_HOUR || '7';
    const minuto = process.env.SCHEDULE_MINUTE || '0';

  console.log(`Agendando para rodar diariamente as ${hora}:${minuto}...\n`);

  const cronExpression = `${minuto} ${hora} * * *`;

  schedule.scheduleJob(cronExpression, () => {
        console.log(`\n[${new Date().toLocaleString('pt-BR')}] Executando geracao agendada...\n`);
        generatePost().catch(console.error);
  });

  console.log('Agendador iniciado!');
    console.log('Pressione Ctrl+C para parar.\n');
}

// ==========================================
// 8 INICIALIZACAO
// ==========================================
function main() {
    if (!OPENAI_API_KEY) {
          console.error('ERRO: OPENAI_API_KEY nao configurada!');
          console.log('Crie um arquivo .env com sua chave da OpenAI');
          process.exit(1);
    }

  const command = process.argv[2];

  if (command === 'schedule') {
        scheduleDaily();
        process.stdin.resume();
  } else {
        generatePost().catch(console.error);
  }
}

main();

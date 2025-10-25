// ATENÇÃO: Esta chave API é um placeholder. Você deve substituí-la pela sua chave API real da CNPJLeads.
const API_KEY = "SUA_CHAVE_API_AQUI"; 
const API_URL = "https://cnpjleads.com/api/v1/companies/search";

// Parâmetros assumidos para a busca. Estes podem precisar de ajuste
// de acordo com a documentação exata da CNPJLeads, que não estava
// totalmente detalhada publicamente.
// natureza_juridica=213-5 (Código comum para MEI - Microempreendedor Individual)
const MEI_FILTER = "natureza_juridica=213-5";

document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const statusMessage = document.getElementById('status-message');
    const emailList = document.getElementById('email-list');
    const searchButton = document.getElementById('search-button');
    const copyButton = document.getElementById('copy-button');

    if (API_KEY === "80|c443ddecbf2876bd28994aea0ee3093b1661887259f17bdfff1fa25f176e1c27") {
        statusMessage.textContent = "ERRO: Por favor, substitua 'SUA_CHAVE_API_AQUI' no arquivo script.js pela sua chave API real da CNPJLeads.";
        emailList.value = "";
        copyButton.disabled = true;
        return;
    }

    statusMessage.textContent = "Buscando... Por favor, aguarde.";
    emailList.value = "";
    searchButton.disabled = true;
    copyButton.disabled = true;

    // Formato da data para a API (assumindo YYYY-MM-DD ou DD/MM/YYYY)
    // Vamos usar o formato YYYY-MM-DD que é o padrão do input[type="date"]
    // A API pode exigir um formato diferente (ex: DD/MM/YYYY ou ISO 8601)
    const dateFromFormatted = dateFrom;
    const dateToFormatted = dateTo;

    // Construindo a URL da API com os filtros
    // Assumindo que a API usa os parâmetros data_abertura_de e data_abertura_ate
    let url = `${API_URL}?${MEI_FILTER}&data_abertura_de=${dateFromFormatted}&data_abertura_ate=${dateToFormatted}&page=1&per_page=50`;

    // Função para buscar dados e extrair emails
    const fetchEmails = async (fetchUrl) => {
        try {
            const response = await fetch(fetchUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Accept': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok || data.success === false) {
                throw new Error(data.message || `Erro na requisição: ${response.status}`);
            }

            const emails = [];
            data.data.forEach(company => {
                // Assumindo que a resposta da API contém um campo 'email'
                if (company.email) {
                    emails.push(company.email);
                }
            });

            // Lidar com a paginação (se houver mais páginas)
            if (data.current_page < data.last_page) {
                statusMessage.textContent = `Página ${data.current_page} de ${data.last_page} processada. Buscando próxima página...`;
                const nextPageUrl = fetchUrl.replace(`page=${data.current_page}`, `page=${data.current_page + 1}`);
                const nextEmails = await fetchEmails(nextPageUrl); // Chamada recursiva
                return emails.concat(nextEmails);
            }

            return emails;

        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            statusMessage.textContent = `Erro ao buscar dados: ${error.message}. Verifique sua chave API e os parâmetros de filtro.`;
            return [];
        }
    };

    const allEmails = await fetchEmails(url);

    if (allEmails.length > 0) {
        const uniqueEmails = [...new Set(allEmails)]; // Remove duplicatas
        emailList.value = uniqueEmails.join('\n');
        statusMessage.textContent = `Busca concluída! ${uniqueEmails.length} emails únicos encontrados de ${allEmails.length} resultados totais.`;
        copyButton.disabled = false;
    } else {
        statusMessage.textContent = "Nenhum email de MEI encontrado para o período especificado.";
        emailList.value = "";
        copyButton.disabled = true;
    }

    searchButton.disabled = false;
});

document.getElementById('copy-button').addEventListener('click', () => {
    const emailList = document.getElementById('email-list');
    emailList.select();
    document.execCommand('copy');
    alert('Emails copiados para a área de transferência!');
});

// Nota sobre o filtro MEI:
// O código acima usa um filtro de natureza jurídica comum para MEI (213-5).
// Se a API CNPJLeads usar um parâmetro de filtro diferente (ex: "porte=MEI" ou "tipo=MEI"),
// a variável MEI_FILTER precisará ser ajustada.
// Por exemplo: const MEI_FILTER = "porte=MEI";
// Recomenda-se consultar a documentação completa da CNPJLeads após obter acesso.

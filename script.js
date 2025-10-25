// Variáveis e Constantes
const API_TOKEN = "80|c443ddecbf2876bd28994aea0ee3093b1661887259f17bdfff1fa25f176e1c27"; // Token fornecido pelo usuário
const API_BASE_URL = "https://cnpjleads.com/api/v1/companies/search";
// Usando o código de Natureza Jurídica para "Empresário Individual" (213-5 ), que é o que o MEI se enquadra.
const MEI_FILTERS = {
    nature_code: "2135"
};

// Elementos do DOM
const searchForm = document.getElementById('searchForm');
const dateFromInput = document.getElementById('dateFrom');
const dateToInput = document.getElementById('dateTo');
const searchButton = document.getElementById('searchButton');
const statusMessage = document.getElementById('statusMessage');
const totalResultsElement = document.getElementById('totalResults');
const totalEmailsElement = document.getElementById('totalEmails');
const emailListTextarea = document.getElementById('emailList');
const downloadButton = document.getElementById('downloadButton');

// Funções Auxiliares
function displayMessage(text, type) {
    statusMessage.textContent = text;
    statusMessage.className = `message ${type}`;
}

function formatDateToApi(dateString) {
    // Converte DD/MM/AAAA para AAAA-MM-DD
    const parts = dateString.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return null;
}

function validateDates(dateFrom, dateTo) {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateFrom) || !regex.test(dateTo)) {
        displayMessage("Erro: O formato da data deve ser DD/MM/AAAA.", "error");
        return false;
    }

    const fromApi = formatDateToApi(dateFrom);
    const toApi = formatDateToApi(dateTo);
    
    if (!fromApi || !toApi) {
        displayMessage("Erro: Formato de data inválido. Use DD/MM/AAAA.", "error");
        return false;
    }

    if (new Date(fromApi) > new Date(toApi)) {
        displayMessage("Erro: A 'Data de Abertura - A partir de' não pode ser posterior à 'Data de Abertura - Até'.", "error");
        return false;
    }
    return true;
}

// Lógica Principal de Busca
async function fetchEmails(dateFrom, dateTo) {
    let allEmails = [];
    let totalCompanies = 0;
    let page = 1;
    let lastPage = 1;

    searchButton.disabled = true;
    displayMessage("Iniciando busca...", "info");
    totalResultsElement.textContent = `Total de Empresas Encontradas: 0`;
    totalEmailsElement.textContent = `Total de Emails Coletados: 0`;
    emailListTextarea.value = '';
    downloadButton.style.display = 'none';

    const fromApi = formatDateToApi(dateFrom);
    const toApi = formatDateToApi(dateTo);

    do {
        displayMessage(`Buscando página ${page} de ${lastPage === 1 ? '?' : lastPage}...`, "info");

        // Construção da URL com o filtro nature_code
        // Se o filtro nature_code não funcionar, tente company_size=MEI
        const url = `${API_BASE_URL}?nature_code=${MEI_FILTERS.nature_code}&opening_date_from=${fromApi}&opening_date_to=${toApi}&page=${page}&per_page=100`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok || data.success === false) {
                // Tenta extrair a mensagem de erro da API
                let apiErrorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
                if (data.message) {
                    apiErrorMessage = data.message;
                } else if (data.errors && Array.isArray(data.errors)) {
                    apiErrorMessage = data.errors.join('; ');
                } else if (response.status === 429) {
                    apiErrorMessage = "Limite de requisições excedido (429 Too Many Requests). Tente novamente mais tarde.";
                } else if (response.status === 401) {
                    apiErrorMessage = "Não Autorizado (401 Unauthorized). Verifique se o token de API está correto.";
                }
                
                displayMessage(`Erro na busca (Página ${page}): ${apiErrorMessage}`, "error");
                lastPage = 0; // Força a saída do loop
                break;
            }

            // Atualiza a paginação e o total
            totalCompanies = data.total;
            lastPage = data.last_page;

            // Processa os dados
            data.data.forEach(company => {
                // A API CNPJLeads retorna um array de emails
                if (company.emails && Array.isArray(company.emails)) {
                    company.emails.forEach(email => {
                        if (email && email.trim() !== '') {
                            allEmails.push(email.trim());
                        }
                    });
                }
                // Em alguns casos, o email pode vir direto na propriedade 'email'
                else if (company.email && company.email.trim() !== '') {
                    allEmails.push(company.email.trim());
                }
            });

            // Atualiza a interface
            const uniqueEmails = [...new Set(allEmails)];
            totalResultsElement.textContent = `Total de Empresas Encontradas: ${totalCompanies}`;
            totalEmailsElement.textContent = `Total de Emails Coletados: ${uniqueEmails.length}`;
            emailListTextarea.value = uniqueEmails.join('\n');

            page++;
        } catch (error) {
            displayMessage(`Erro de conexão: ${error.message}`, "error");
            console.error("Erro de conexão:", error);
            lastPage = 0; // Força a saída do loop
            break;
        }

    } while (page <= lastPage);

    searchButton.disabled = false;

    if (page > lastPage && lastPage > 0) {
        const uniqueEmails = [...new Set(allEmails)];
        displayMessage(`Busca concluída! ${uniqueEmails.length} emails únicos coletados de ${totalCompanies} empresas.`, "success");
        downloadButton.style.display = uniqueEmails.length > 0 ? 'block' : 'none';
        emailListTextarea.value = uniqueEmails.join('\n');
    } else if (lastPage === 0) {
        // Erro já foi exibido
    } else {
        displayMessage("Busca interrompida devido a erro ou limite de requisições.", "error");
    }
}

// Event Listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const dateFrom = dateFromInput.value;
    const dateTo = dateToInput.value;

    if (validateDates(dateFrom, dateTo)) {
        fetchEmails(dateFrom, dateTo);
    }
});

downloadButton.addEventListener('click', () => {
    const textToSave = emailListTextarea.value;
    const blob = new Blob([textToSave], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const dateFrom = dateFromInput.value.replace(/\//g, '-');
    const dateTo = dateToInput.value.replace(/\//g, '-');
    a.download = `emails_mei_${dateFrom}_a_${dateTo}.txt`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Preenche os campos com a data de teste mais recente
dateFromInput.value = '01/01/2024';
dateToInput.value = '31/01/2024';

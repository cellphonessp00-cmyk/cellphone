/* =========================================================
   MEGA CASA SP — dados da loja e produtos
   Único arquivo que você precisa editar para mudar preços,
   estoque, fotos e textos.
   ========================================================= */

const LOJA = {
  nome: "Mega Casa SP",
  slogan: "Eletrodomésticos e motos elétricas com entrega rápida em São Paulo",
  whatsapp: "5511999999999",      // só dígitos: 55 + DDD + número
  instagram: "cellphonessp00",    // sem @
  parcelas: 10,                   // parcelas sem juros
  descontoPix: 5,                 // % de desconto no Pix
  freteGratisAcima: 299           // frete grátis a partir deste valor
};

const CATEGORIAS = [
  { id: "motos",         nome: "Motos elétricas",  icone: "🛵" },
  { id: "mobilidade",    nome: "Bikes e patinetes", icone: "🚲" },
  { id: "cozinha",       nome: "Cozinha",          icone: "🍳" },
  { id: "refrigeracao",  nome: "Geladeiras",       icone: "🧊" },
  { id: "lavanderia",    nome: "Lavanderia",       icone: "🧺" },
  { id: "climatizacao",  nome: "Ar e ventilação",  icone: "❄️" },
  { id: "tvs",           nome: "TVs",              icone: "📺" },
  { id: "limpeza",       nome: "Limpeza",          icone: "🧹" }
];

/* Campos: id, nome, marca, categoria, arte (ilustração), cor, preco, precoAntigo,
   estoque, avaliacao (0-5), avaliacoes, vendidos, freteGratis, entregaRapida,
   voltagens (lista ou null), destaque, specs, descricao, imagem (caminho ou null) */
const PRODUTOS = [
  { id:"moto-eletrica-urban-3000", nome:"Moto Elétrica Urban 3000W Bateria de Lítio 72V", marca:"Volta Moto", categoria:"motos", arte:"moto", cor:"#1f6feb",
    preco:18990, precoAntigo:22990, estoque:6, avaliacao:4.8, avaliacoes:312, vendidos:900, freteGratis:true, entregaRapida:false, voltagens:null, destaque:true,
    specs:{ "Potência":"3000W", "Bateria":"Lítio 72V 40Ah removível", "Autonomia":"até 90 km", "Velocidade máx.":"75 km/h", "Recarga":"6 a 8 h em tomada comum", "Garantia":"1 ano (bateria 2 anos)" },
    descricao:"Para o dia a dia na cidade sem gasolina: bateria removível para carregar em casa, painel digital, freio a disco e partida por chave presencial." },
  { id:"scooter-eletrica-city-2000", nome:"Scooter Elétrica City 2000W com Baú e Alarme", marca:"E-Ride", categoria:"motos", arte:"scooter", cor:"#e5484d",
    preco:10990, precoAntigo:13490, estoque:9, avaliacao:4.7, avaliacoes:528, vendidos:1500, freteGratis:true, entregaRapida:false, voltagens:null, destaque:true,
    specs:{ "Potência":"2000W", "Bateria":"Lítio 60V 30Ah", "Autonomia":"até 70 km", "Velocidade máx.":"55 km/h", "Recarga":"5 a 7 h", "Extras":"Baú, alarme, ré e farol LED" },
    descricao:"Estilo clássico, assento confortável para dois e baú incluso. Ótima para entregas e deslocamentos curtos." },
  { id:"ciclomotor-eletrico-1000", nome:"Ciclomotor Elétrico 1000W Aro 10 com Pedal", marca:"E-Ride", categoria:"motos", arte:"scooter", cor:"#2bb673",
    preco:6490, precoAntigo:7990, estoque:14, avaliacao:4.6, avaliacoes:1104, vendidos:3200, freteGratis:true, entregaRapida:true, voltagens:null, destaque:false,
    specs:{ "Potência":"1000W", "Bateria":"Lítio 48V 20Ah", "Autonomia":"até 45 km", "Velocidade máx.":"32 km/h", "Recarga":"4 a 6 h", "Peso":"52 kg" },
    descricao:"Compacto e leve, com pedal auxiliar e retrovisores. Confira as regras de habilitação e emplacamento da sua cidade." },
  { id:"moto-eletrica-sport-5000", nome:"Moto Elétrica Sport 5000W Painel TFT e App", marca:"Volta Moto", categoria:"motos", arte:"moto", cor:"#111827",
    preco:27990, precoAntigo:31990, estoque:3, avaliacao:4.9, avaliacoes:97, vendidos:210, freteGratis:true, entregaRapida:false, voltagens:null, destaque:true,
    specs:{ "Potência":"5000W", "Bateria":"Lítio 72V 60Ah", "Autonomia":"até 130 km", "Velocidade máx.":"95 km/h", "Recarga":"8 h (rápida 3 h)", "Conectividade":"App com GPS e bloqueio remoto" },
    descricao:"Desempenho de moto 150cc com custo por km muito menor. Painel TFT, 3 modos de pilotagem e freio ABS." },
  { id:"bike-eletrica-aro29", nome:"Bicicleta Elétrica Aro 29 350W 21 Marchas", marca:"E-Ride", categoria:"mobilidade", arte:"bike", cor:"#f59e0b",
    preco:4990, precoAntigo:5990, estoque:18, avaliacao:4.7, avaliacoes:845, vendidos:2700, freteGratis:true, entregaRapida:true, voltagens:null, destaque:true,
    specs:{ "Motor":"350W no cubo traseiro", "Bateria":"Lítio 36V 10Ah no quadro", "Autonomia":"até 50 km", "Velocidade assistida":"até 25 km/h", "Câmbio":"21 marchas", "Freios":"A disco" },
    descricao:"Pedal assistido com 5 níveis, quadro de alumínio e bateria escondida no quadro." },
  { id:"patinete-eletrico-350", nome:"Patinete Elétrico 350W Dobrável Pneu 10\"", marca:"E-Ride", categoria:"mobilidade", arte:"patinete", cor:"#6b7280",
    preco:1899, precoAntigo:2499, estoque:25, avaliacao:4.6, avaliacoes:2310, vendidos:8000, freteGratis:true, entregaRapida:true, voltagens:null, destaque:true,
    specs:{ "Motor":"350W", "Bateria":"36V 10Ah", "Autonomia":"até 30 km", "Velocidade máx.":"25 km/h", "Peso suportado":"120 kg", "Dobrável":"Sim, em 3 segundos" },
    descricao:"Leve para levar no metrô, com app, farol e luz de freio." },

  { id:"airfryer-mondial-5l", nome:"Fritadeira Air Fryer 5L Family Antiaderente", marca:"Mondial", categoria:"cozinha", arte:"airfryer", cor:"#111827",
    preco:349.9, precoAntigo:499.9, estoque:60, avaliacao:4.8, avaliacoes:15420, vendidos:50000, freteGratis:true, entregaRapida:true, voltagens:["127V","220V"], destaque:true,
    specs:{ "Capacidade":"5 litros", "Potência":"1900W", "Temperatura":"80 a 200 °C", "Timer":"60 min", "Cesto":"Antiaderente, vai na lava-louças" },
    descricao:"Frita, assa e reaquece sem óleo. Cabe frango inteiro." },
  { id:"airfryer-forno-philco-12l", nome:"Air Fryer Oven 12L 3 em 1 com Espeto Giratório", marca:"Philco", categoria:"cozinha", arte:"airfryer", cor:"#9ca3af",
    preco:599.9, precoAntigo:899.9, estoque:22, avaliacao:4.7, avaliacoes:3870, vendidos:9000, freteGratis:true, entregaRapida:true, voltagens:["127V","220V"], destaque:false,
    specs:{ "Capacidade":"12 litros", "Potência":"1800W", "Funções":"Fritar, assar, desidratar", "Acessórios":"Espeto, 2 grelhas, bandeja" },
    descricao:"Forno e air fryer no mesmo aparelho, com porta de vidro para acompanhar o preparo." },
  { id:"microondas-electrolux-31l", nome:"Micro-ondas 31L Painel Integrado Tira Odor", marca:"Electrolux", categoria:"cozinha", arte:"microondas", cor:"#e5e7eb",
    preco:699, precoAntigo:899, estoque:30, avaliacao:4.7, avaliacoes:6120, vendidos:20000, freteGratis:true, entregaRapida:true, voltagens:["127V","220V"], destaque:false,
    specs:{ "Capacidade":"31 litros", "Potência":"900W", "Receitas":"Menu com 16 receitas", "Cor":"Branco" },
    descricao:"Função Tira Odor e Limpa Fácil, com prato giratório de 31,5 cm." },
  { id:"cafeteira-expresso-15bar", nome:"Cafeteira Expresso 15 Bar com Vaporizador", marca:"Oster", categoria:"cozinha", arte:"cafeteira", cor:"#991b1b",
    preco:599, precoAntigo:799, estoque:15, avaliacao:4.6, avaliacoes:2140, vendidos:6000, freteGratis:true, entregaRapida:true, voltagens:["127V","220V"], destaque:false,
    specs:{ "Pressão":"15 bar", "Reservatório":"1,5 L", "Vaporizador":"Sim, para cappuccino", "Usa":"Pó e sachê" },
    descricao:"Expresso cremoso em casa, com bico vaporizador para leite." },
  { id:"liquidificador-arno-1400", nome:"Liquidificador Power Max 1400W 15 Velocidades", marca:"Arno", categoria:"cozinha", arte:"liquidificador", cor:"#111827",
    preco:229, precoAntigo:299, estoque:40, avaliacao:4.7, avaliacoes:9800, vendidos:30000, freteGratis:false, entregaRapida:true, voltagens:["127V","220V"], destaque:false,
    specs:{ "Potência":"1400W", "Copo":"3,1 L em San", "Velocidades":"15 + pulsar", "Lâminas":"6 lâminas de aço inox" },
    descricao:"Tritura gelo e frutas congeladas com facilidade." },
  { id:"fogao-brastemp-5bocas", nome:"Fogão 5 Bocas Inox com Mesa de Vidro e Acendimento Automático", marca:"Brastemp", categoria:"cozinha", arte:"fogao", cor:"#d1d5db",
    preco:2299, precoAntigo:2899, estoque:8, avaliacao:4.8, avaliacoes:1430, vendidos:3000, freteGratis:true, entregaRapida:false, voltagens:["Bivolt"], destaque:false,
    specs:{ "Bocas":"5, com tripla chama", "Forno":"88 L com grill", "Mesa":"Vidro temperado", "Acendimento":"Automático" },
    descricao:"Tripla chama para wok e forno grande com grill elétrico." },
  { id:"panela-pressao-eletrica-6l", nome:"Panela de Pressão Elétrica 6L Multifunções", marca:"Electrolux", categoria:"cozinha", arte:"panela", cor:"#374151",
    preco:449, precoAntigo:599, estoque:3, avaliacao:4.8, avaliacoes:4210, vendidos:12000, freteGratis:true, entregaRapida:true, voltagens:["127V","220V"], destaque:false,
    specs:{ "Capacidade":"6 litros", "Programas":"14", "Segurança":"9 sistemas", "Panela":"Antiaderente removível" },
    descricao:"Feijão em 30 minutos sem chiado e sem medo." },
  { id:"purificador-agua", nome:"Purificador de Água Gelada Compressor", marca:"Electrolux", categoria:"cozinha", arte:"purificador", cor:"#f3f4f6",
    preco:549, precoAntigo:699, estoque:20, avaliacao:4.6, avaliacoes:2980, vendidos:7000, freteGratis:true, entregaRapida:true, voltagens:["Bivolt"], destaque:false,
    specs:{ "Refrigeração":"Compressor", "Filtragem":"Retém cloro e partículas", "Temperaturas":"Natural e gelada", "Instalação":"Parede ou bancada" },
    descricao:"Água gelada e filtrada direto da torneira." },

  { id:"geladeira-brastemp-462l", nome:"Geladeira Frost Free Inverter 462L Inox", marca:"Brastemp", categoria:"refrigeracao", arte:"geladeira", cor:"#cbd5e1",
    preco:4299, precoAntigo:5299, estoque:7, avaliacao:4.8, avaliacoes:2650, vendidos:5000, freteGratis:true, entregaRapida:false, voltagens:["127V","220V"], destaque:true,
    specs:{ "Capacidade":"462 litros", "Degelo":"Frost Free", "Tecnologia":"Inverter (economia de energia)", "Selo Procel":"A", "Cor":"Inox" },
    descricao:"Compressor inverter, freezer em cima e gavetão de legumes com controle de umidade." },
  { id:"geladeira-samsung-side-602l", nome:"Geladeira Side by Side 602L com Dispenser de Água", marca:"Samsung", categoria:"refrigeracao", arte:"geladeira2", cor:"#4b5563",
    preco:8999, precoAntigo:11499, estoque:4, avaliacao:4.9, avaliacoes:820, vendidos:1200, freteGratis:true, entregaRapida:false, voltagens:["127V","220V"], destaque:true,
    specs:{ "Capacidade":"602 litros", "Portas":"Side by Side", "Dispenser":"Água e gelo", "Tecnologia":"Inverter Digital", "Cor":"Inox Look escuro" },
    descricao:"Duas portas largas, dispenser de água gelada e gelo, e controle por app." },

  { id:"lava-seca-samsung-11kg", nome:"Lava e Seca 11kg Inverter com Vapor", marca:"Samsung", categoria:"lavanderia", arte:"lavadora", cor:"#f3f4f6",
    preco:3799, precoAntigo:4699, estoque:10, avaliacao:4.8, avaliacoes:3410, vendidos:6000, freteGratis:true, entregaRapida:false, voltagens:["127V","220V"], destaque:true,
    specs:{ "Lavagem":"11 kg", "Secagem":"7 kg", "Motor":"Inverter", "Programas":"14, com vapor higienizador", "Abertura":"Frontal" },
    descricao:"Lava e seca no mesmo ciclo, com vapor que remove 99,9% das bactérias." },
  { id:"lavadora-electrolux-13kg", nome:"Máquina de Lavar 13kg Essential Care", marca:"Electrolux", categoria:"lavanderia", arte:"lavadora2", cor:"#ffffff",
    preco:2199, precoAntigo:2699, estoque:16, avaliacao:4.7, avaliacoes:7800, vendidos:15000, freteGratis:true, entregaRapida:true, voltagens:["127V","220V"], destaque:false,
    specs:{ "Capacidade":"13 kg", "Abertura":"Superior", "Programas":"11", "Extras":"Cesto inox, Jet&Clean" },
    descricao:"Lava edredom de casal e economiza água com reaproveitamento." },
  { id:"lava-loucas-brastemp-8", nome:"Lava-Louças 8 Serviços Inox", marca:"Brastemp", categoria:"lavanderia", arte:"lavaloucas", cor:"#d1d5db",
    preco:2599, precoAntigo:3199, estoque:0, avaliacao:4.7, avaliacoes:1120, vendidos:2500, freteGratis:true, entregaRapida:false, voltagens:["127V","220V"], destaque:false,
    specs:{ "Capacidade":"8 serviços", "Programas":"5", "Consumo":"9 L por ciclo", "Instalação":"Livre ou embutir" },
    descricao:"Lava a louça do dia gastando menos água que a pia." },

  { id:"ar-split-lg-12000", nome:"Ar-Condicionado Split Inverter 12.000 BTUs Quente/Frio", marca:"LG", categoria:"climatizacao", arte:"arcond", cor:"#ffffff",
    preco:2499, precoAntigo:3199, estoque:12, avaliacao:4.8, avaliacoes:5600, vendidos:11000, freteGratis:true, entregaRapida:true, voltagens:["220V"], destaque:true,
    specs:{ "Capacidade":"12.000 BTUs", "Ciclo":"Quente e frio", "Tecnologia":"Dual Inverter (até 70% de economia)", "Wi-Fi":"Sim, controle pelo app", "Ambiente":"até 20 m²" },
    descricao:"Silencioso, econômico e com controle por voz e celular. Instalação não inclusa." },
  { id:"ventilador-coluna-40", nome:"Ventilador de Coluna 40cm Turbo 8 Pás", marca:"Mondial", categoria:"climatizacao", arte:"ventilador", cor:"#111827",
    preco:199, precoAntigo:269, estoque:80, avaliacao:4.7, avaliacoes:21300, vendidos:60000, freteGratis:false, entregaRapida:true, voltagens:["127V","220V"], destaque:false,
    specs:{ "Diâmetro":"40 cm", "Pás":"8", "Velocidades":"3", "Potência":"140W", "Altura":"ajustável" },
    descricao:"Turbo e silencioso, com oscilação e inclinação ajustável." },

  { id:"smart-tv-55-4k", nome:"Smart TV 55\" Crystal UHD 4K com Alexa", marca:"Samsung", categoria:"tvs", arte:"tv", cor:"#111827",
    preco:2699, precoAntigo:3299, estoque:14, avaliacao:4.8, avaliacoes:8900, vendidos:18000, freteGratis:true, entregaRapida:true, voltagens:["Bivolt"], destaque:true,
    specs:{ "Tela":"55 polegadas", "Resolução":"4K UHD", "Sistema":"Tizen", "HDR":"HDR10+", "Conexões":"3 HDMI, 2 USB, Wi-Fi, Bluetooth" },
    descricao:"Imagem 4K com cores vivas e todos os apps de streaming." },
  { id:"smart-tv-65-qled", nome:"Smart TV 65\" QLED 4K Google TV 144Hz", marca:"TCL", categoria:"tvs", arte:"tv", cor:"#1f2937",
    preco:3999, precoAntigo:4999, estoque:9, avaliacao:4.7, avaliacoes:2400, vendidos:4000, freteGratis:true, entregaRapida:true, voltagens:["Bivolt"], destaque:false,
    specs:{ "Tela":"65 polegadas", "Painel":"QLED", "Taxa":"144 Hz", "Sistema":"Google TV", "Áudio":"Dolby Atmos" },
    descricao:"Telão para filmes e games, com taxa de 144 Hz e Dolby Vision." },

  { id:"robo-aspirador-laser", nome:"Robô Aspirador e Passa Pano com Mapeamento a Laser", marca:"Xiaomi", categoria:"limpeza", arte:"robo", cor:"#f9fafb",
    preco:1299, precoAntigo:1999, estoque:11, avaliacao:4.7, avaliacoes:3900, vendidos:9000, freteGratis:true, entregaRapida:true, voltagens:["Bivolt"], destaque:true,
    specs:{ "Navegação":"LiDAR (laser)", "Sucção":"4000 Pa", "Funções":"Aspira e passa pano", "Bateria":"até 150 min", "App":"Mapa da casa e agendamento" },
    descricao:"Limpa a casa sozinho e volta para a base. Programe pelo celular." },
  { id:"aspirador-vertical-sem-fio", nome:"Aspirador Vertical Sem Fio 2 em 1", marca:"Electrolux", categoria:"limpeza", arte:"aspirador", cor:"#7c3aed",
    preco:699, precoAntigo:899, estoque:2, avaliacao:4.6, avaliacoes:1700, vendidos:5000, freteGratis:true, entregaRapida:true, voltagens:["Bivolt"], destaque:false,
    specs:{ "Tipo":"Vertical e de mão", "Bateria":"até 40 min", "Filtro":"HEPA lavável", "Peso":"2,4 kg" },
    descricao:"Vira aspirador de mão para sofá e carro." }
];

/**
 * The Help in Portuguese, first part: one entry per menu, as [title, body]; a blank line starts a new paragraph.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
export const HELP_PT_A: Record<string, readonly [string, string]> = {
  start: ["Primeiros passos", `O Studio é a consola do A.R.M.O.R.: daqui vigia o perímetro, responde aos alarmes, vê as câmaras, a energia solar, a instalação elétrica e a rede, e desenha o local e o seu alarme.

O menu da esquerda tem os ecrãs em grupos: Monitorização (o resumo, a meteorologia e os alarmes), Segurança (as centrais de alarme, as câmaras, o radar, as gravações e o histórico), Energia (inversores, baterias e a instalação elétrica), Casa e rede (dispositivos, automatizações e a rede), Desenho (os desenhadores do local, do alarme, elétrico e de rede) e Administração. Clique no título de um grupo para o recolher ou expandir; o Studio lembra-se de quais recolheu, e o grupo do ecrã em que está nunca se oculta. A seta de cima recolhe todo o menu para ícones. A barra superior mostra o ecrã em que está, a revisão do servidor, o botão armado / desarmado, o ecrã inteiro, a Ajuda (esta janela) e o Acerca de.

O botão grande do canto superior direito arma ou desarma todo o sistema. Desarmar pede o seu PIN (Configuração > Utilizadores); um PIN de coação também desarma, mas dispara em silêncio um alarme crítico. Com o sistema armado, uma intrusão, uma porta aberta ou uma câmara que deixa de responder dispara um alarme; desarmar fecha os que dependem do modo.

Deixar o ponteiro sobre qualquer botão, campo ou entrada do menu mostra uma breve explicação do que faz. O idioma e o aspeto da consola estão em Configuração.`],
  overview: ["Resumo", `O primeiro ecrã. Reúne, em cartões, o que merece um olhar: o estado do perímetro (armado ou desarmado), os nós de campo que estão ligados, os rastos ativos que os radares veem, as câmaras que estão ativadas e os alarmes à espera de uma pessoa.

«Precisa de atenção» lista as coisas que pedem alguém: alarmes por ver e nós com problemas; cada um abre o seu ecrã. «Atividade recente» são os últimos eventos, do mais recente para o mais antigo. As «Ações rápidas» saltam para as câmaras, o desenhador do local ou o formulário para adicionar um dispositivo.

O pequeno mapa em direto mostra o local com os alvos dos radares à medida que se movem. Se o servidor não puder ser alcançado, o ecrã di-lo e mostra dados de demonstração, claramente assinalados como tal.`],
  weather: ["Meteorologia", `A previsão do seu local: agora, as próximas 48 horas e os próximos dias, com avisos da previsão e a qualidade do ar.

Da primeira vez, ativa a meteorologia e escolhe o local: procure uma localidade, ou escreva você mesmo a latitude e a longitude. O local fica guardado neste servidor. «Mudar de local» escolhe outro; «Desativar e esquecer o local» remove-o.

O radar de chuva reproduz as últimas imagens de chuva (e, se quiser, de nuvens do satélite) sobre um mapa. Reproduzir e Pausa controlam a animação, o controlo de opacidade deixa ver o mapa por baixo, e «Centrar no meu local» recentra a vista.

A meteorologia lê-se de serviços públicos; nada das suas câmaras ou sensores lhes é enviado, só o local que escolheu.`],
  alarms: ["Alarmes", `Tudo o que precisa de uma pessoa neste momento. Um alarme dispara quando algo corre mal - uma intrusão, fumo, uma porta aberta com o sistema armado, uma câmara ou um dispositivo que deixou de responder, uma bateria fraca, uma central de alarme que soa ou é violada, um dispositivo novo na rede, uma porta aberta arriscada - e fica na lista até alguém o reconhecer.

Um novo alarme crítico faz soar três apitos e, se permitir notificações no navegador (pergunta no seu primeiro clique no Studio), também aparece como notificação quando o Studio está noutro separador. Os alarmes que já estavam na lista quando abriu o Studio não se voltam a anunciar.

Reconhecer marca um alarme como visto; Reconhecer todos marca todos os que estão à espera. Um alarme reconhecido sai da lista e fica guardado no Registo abaixo, a sua causa tenha terminado ou não; a história completa fica no Histórico. Se a sua causa continua, a mesma condição reportada de novo não o traz de volta: só volta depois de a causa terminar e acontecer de novo.

Detalhes mostra os factos de um alarme (dispositivo, endereço, MAC, porta, números). A cruz apaga um alarme. «Marcar o dispositivo como conhecido» diz ao A.R.M.O.R. que um dispositivo novo é bem-vindo. Os filtros reduzem a lista por gravidade e origem, e a caixa de pesquisa procura qualquer texto. O botão grande arma ou desarma o sistema; desarmar pede o seu PIN.

Antes de armar: o botão pergunta primeiro ao servidor e mostra o que deixaria o perímetro cego ou ruidoso - um nó de radar que não responde, uma central de alarme muda, uma zona aberta, uma câmara em baixo, uma porta ou janela aberta e alarmes que ninguém viu. Se algo bloqueia, o botão diz «Armar mesmo assim»; nada se arma até confirmar. O botão com visto na barra superior mostra a mesma verificação sem armar. Um alarme novo aparece também como janela que nunca bloqueia a página, com botão Reconhecer e salto para o menu certo; os sons, a voz e as janelas escolhem-se em Configuração > Preferências. Uma conta com função de observador só olha e não pode armar.`],
  alarmPanels: ["Centrais de alarme", `Os nós de alarme (ARMOR-ALARM): cada um lê as suas zonas com fio e escuta os seus sensores Zigbee, gere a central (armar, atrasos, a sirene, o PIN) e diz ao servidor o que vê.

Cada cartão mostra se o nó está em vigilância, o seu modo (ausente ou em casa), as suas zonas e o que aconteceu por último. Um alarme a soar dispara um alarme crítico no menu Alarmes, e uma zona em violação um alto. «Procurar nós» encontra centrais na rede local que ainda não estão no sistema.

Um administrador pode armar e desarmar uma central daqui, mas só quando três coisas o permitem: o servidor (ARMOR_ALARM_COMMANDS=1), o nó (a sua definição para os comandos do servidor) e o broker (a sua lista de acessos). Um desarme a partir daqui pede o PIN do utilizador com sessão iniciada: o servidor verifica-o e o nó nunca o vê. Um comando aceite não é um alarme armado: o cartão mostra o que o nó diz a seguir. Isto não é um sistema de alarme certificado.

«Abrir o Desenhador de alarme» leva-o ao desenho do alarme da casa: as centrais mostradas aqui aparecem lá com as suas zonas como sensores, associadas às reais, e a partir de uma central associada no desenho volta a este menu.`],
  cameras: ["Câmaras", `A vista em direto das câmaras IP do local. Escolha uma disposição (uma câmara, uma grelha, uma parede) e cada lugar mostra uma câmara; um lugar com lista pendente deixa escolher qual. Um clique numa câmara amplia-a; as setas vão para a seguinte ou a anterior.

Numa câmara: Fotografia guarda uma foto nas Gravações, o botão vermelho grava e para, e os controlos PTZ movem uma câmara motorizada (rotação, inclinação, zoom) quando o suporta. A parede em ecrã inteiro mostra as câmaras da vista em todo o ecrã, sem espaços.

«Configurar câmaras» abre as definições das câmaras: adicione uma câmara com o seu nome, endereço, porta RTSP e caminho, porta ONVIF e, se for preciso, um endereço de imagem; o utilizador e a palavra-passe da câmara vão só para o seu servidor local, que os guarda cifrados, e nunca ficam no navegador. Detetar emissões ajuda a encontrar o caminho certo. As câmaras que deixam de responder disparam um alarme com o sistema armado.`],
  radar: ["Radar", `O mapa em direto do que os nós de radar veem. Cada radar do local desenha-se com a zona que cobre, e cada alvo aparece onde está, na cor do seu radar. Os alvos vistos por dois radares ao mesmo tempo fundem-se num só.

O mapa desenha-se a partir do desenho do seu local: terreno, edifícios, câmaras e radares. Abaixo, as definições de cada radar LD2450: que nó de campo e canal reportam por ele, onde está (posição, altura) e para onde olha. O que definir aqui desenha a sua cobertura e coloca os seus alvos; o próprio módulo de radar guarda a configuração gravada no seu nó.

«Espelhar o eixo lateral» corrige um radar montado ao contrário. As «Zonas a ignorar» são áreas onde nada se reporta (uma árvore que se mexe, uma ventoinha): desenhe uma arrastando no plano. Um nó com três radares cobre cerca de 270 graus; «Adicionar um nó de 270°» cria os três radares num só sítio, prontos a mover para onde o nó está.`],
  record: ["Gravações", `As fotografias e gravações guardadas das câmaras. A lista da esquerda mostra-as com a data e o tamanho; os filtros escolhem tudo, só fotografias ou só gravações. Escolha uma e abre-se à direita: uma fotografia mostra-se grande, uma gravação reproduz-se.

«Manter (proteger)» mantém a fotografia ou gravação escolhida fora da limpeza automática (o servidor guarda 30 dias ou 20 GB, as mais antigas primeiro) - use-o para o que possa ser prova. Um item protegido mostra «Protegido: libertar»; não é apagado pelas limpezas em massa e tem de ser libertado primeiro.

Apaga os itens selecionados com «Apagar selecionados», ou limpa em massa: tudo do tipo escolhido, ou só o que for mais antigo que um número de dias. Apagar é permanente e o Studio pergunta primeiro. O ecrã Câmaras mostra que câmaras estão a gravar, e continua a sabê-lo depois de recarregar a página.

As fotografias e gravações fazem-se a partir do ecrã Câmaras (Fotografia e o botão vermelho de gravar).

Prova de custódia: o botão «Prova de custódia» descarrega um ficheiro assinado pelo servidor com o tamanho, o SHA-256 da prova tal como está agora, quando foi feita e cada linha da auditoria sobre ela (quem a protegeu, quem pediu a sua impressão digital). Entregue-o junto com o ficheiro: o servidor pode dizer se o documento é autêntico e se o ficheiro ainda tem a mesma impressão digital.`],
  history: ["Histórico", `Tudo o que aconteceu, do mais recente para o mais antigo: cada mudança de nível de alerta de um nó, nós e câmaras a ficar ligados ou desligados, mudanças do modo de segurança, alarmes disparados, reconhecidos e terminados, e eventos de dispositivos e da rede. É o sítio para ver toda a história, também dos alarmes que já reconheceu.

O resumo de cima conta os eventos guardados, os das últimas 24 horas, os alertas ALTOS e os incidentes de nós. Os filtros escolhem o tipo de evento, o nível de alerta e um período (de / até); a caixa de pesquisa procura qualquer texto. «Carregar eventos mais antigos» pede mais ao servidor. «Em direto» atualiza a cada cinco segundos e pode pausar-se. «Limpar histórico» apaga os eventos guardados mas não os alarmes.`],
  inverters: ["Inversores", `Os inversores solares e as suas leituras em direto, tal como os nós de ligação (ARMOR-SOLAR) as leem: potência, tensões, consumo, bateria e temperatura, com o estado do inversor (rede, bateria, avaria) e os avisos que reporta.

Aqui declara o equipamento com «Adicionar um inversor»: um nome, o nó de ligação que o lê, o seu identificador (o nome curto usado nas definições do nó), o seu modelo e como está ligado. As leituras são só de leitura: vêm do nó. Enquanto o nó não enviou a primeira leitura, o equipamento espera; «Mostrar leituras de exemplo» preenche o ecrã com valores inventados para ver como ficará (não se guarda nada).

O Histórico mostra como as leituras mudaram ao longo do tempo. Uma avaria do inversor dispara um alarme ALTO; uma bateria abaixo de 20 % dispara um aviso. Se um inversor fica em silêncio durante algum tempo, o ecrã diz «sem dados há algum tempo» e dispara-se um alarme.`],
  batteries: ["Baterias", `Os bancos de baterias e as suas leituras em direto: estado de carga, tensão, corrente, temperatura e, nos bancos que os reportam, cada módulo e cada célula.

«Adicionar uma bateria» declara uma da mesma forma que um inversor: nome, nó de ligação, identificador, modelo e ligação. «Células» mostra as células de um módulo uma a uma, para que uma célula fraca se destaque. Um módulo que não está presente fica marcado como «não presente».

Uma bateria abaixo de 20 % de carga dispara um aviso que termina quando volta a estar acima de 30 %; uma bateria que reporta um alarme próprio dispara um alarme ALTO. O Histórico mostra como a carga e a tensão mudaram ao longo do tempo.`],
  electrical: ["Elétrico", `Os nós elétricos (ARMOR-ELECTRICAL) e o esquema em direto da instalação. Os nós leem contadores de energia por RS485 e reportam canais: tensão, corrente, potência e energia da rede, dos subcircuitos e do lado solar.

Se desenhou a instalação no Desenhador elétrico e associou os seus elementos a nós, o esquema aqui mostra os valores em direto sobre ele. Sem desenho, vê os nós e os seus canais em lista. Quando ainda nenhum nó elétrico reportou, o ecrã diz-lhe o que fazer: ligue um nesta rede e procure-o no localizador de nós.

Os alarmes desta área são avisos que terminam sozinhos: um contador que dispara o seu próprio alarme, uma tensão da rede fora de gama (cerca de 230 V, de 195 a 253) e a perda da entrada da rede; uma avaria retida de um contactor é ALTA.

Energia por dia: um cartão soma, para a última semana, o que o contador de cada canal contou. Soma só a diferença entre leituras, por isso um contador que dá a volta aos 9 999,99 kWh ou recomeça do zero após um corte não gera um dia negativo nem volta a contar todo o seu total; o dia em que acontece fica assinalado.`],
};

import { connect, disconnect } from '../db/connection';
import { FlowActionTypes, Flows, FlowActions } from '../db/models';

connect()
  .then(async () => {
    let rootFlow = await Flows.findOne({ name: 'Root' });

    if (!rootFlow) {
      rootFlow = await Flows.createFlow({
        assignedUserId: 'Yxm7fPB9ytuCTnvZD',
        name: 'Root',
        description: '',
      });
    }

    let customerServiceFlow = await Flows.findOne({ name: 'Customer service' });

    if (!customerServiceFlow) {
      customerServiceFlow = await Flows.createFlow({
        assignedUserId: 'Yxm7fPB9ytuCTnvZD',
        name: 'Customer service',
        description: '',
      });
    }

    let commercialAreaFlow = await Flows.findOne({ name: 'Commercial area' });

    if (!commercialAreaFlow) {
      commercialAreaFlow = await Flows.createFlow({
        assignedUserId: 'Yxm7fPB9ytuCTnvZD',
        name: 'Commercial area',
        description: '',
      });
    }

    let financialFlow = await Flows.findOne({ name: 'Financial' });

    if (!financialFlow) {
      financialFlow = await Flows.createFlow({
        assignedUserId: 'Yxm7fPB9ytuCTnvZD',
        name: 'Financial',
        description: '',
      });
    }

    let purchasingSectorFlow = await Flows.findOne({ name: 'Purchasing Sector' });

    if (!purchasingSectorFlow) {
      purchasingSectorFlow = await Flows.createFlow({
        assignedUserId: 'Yxm7fPB9ytuCTnvZD',
        name: 'Purchasing Sector',
        description: '',
      });
    }

    const conditionType = await FlowActionTypes.findOne({
      type: 'erxes.action.conditional',
    });

    const sendMessageType = await FlowActionTypes.findOne({
      type: 'erxes.action.send.message',
    });

    const askType = await FlowActionTypes.findOne({
      type: 'erxes.action.to.ask',
    });

    const transferToAgentType = await FlowActionTypes.findOne({
      type: 'erxes.action.transfer.to.agent',
    });

    const defineDepartmentType = await FlowActionTypes.findOne({
      type: 'erxes.action.define.department',
    });

    const executeFlowType = await FlowActionTypes.findOne({
      type: 'erxes.action.execute.automation.flow',
    });

    if (!(await FlowActions.count({ flowId: rootFlow.id }))) {
      await FlowActions.createFlowAction({
        order: 0,
        type: conditionType?.type,
        flowId: rootFlow.id,
        actionId: conditionType?.id,
        value: JSON.stringify({
          conditions: [
            {
              type: 'erxes.conditional.variable',
              operator: '=',
              variable: {
                key: 'onboarding_active',
                value: '0',
              },
              action: 'erxes.action.execute.action',
              value: '10',
            },
          ],
        }),
      });

      await FlowActions.createFlowAction({
        order: 1,
        type: askType?.type,
        flowId: rootFlow.id,
        actionId: askType?.id,
        value: JSON.stringify({
          content: [
            'Olá, tudo bem?<br/>' +
              '<br/>Sou o Sr. Nine, assistente virtual da i9 Food Service!<br/>' +
              '<br/>Estou aqui para ajudá-lo a ter um atendimento mais rápido e objetivo.<br/>' +
              '<br/>Vamos começar?<br/>' +
              '<br/>Primeiro Selecione a opção desejada digitando uma das opções a baixo:<br/>' +
              '<br/><b>1</b> - Atendimento ao Cliente' +
              '<br/><b>2</b> - Área Comercial' +
              '<br/><b>3</b> - Financeiro' +
              '<br/><b>4</b> - Setor de Compras',
          ],
          conditions: [
            {
              operator: '=',
              values: ['1', 'atendimento', 'ajuda', 'duvidas', 'atendimento ao cliente', 'cliente', 'atendente'],
              action: 'erxes.action.execute.action',
              value: '2',
            },
            {
              operator: '=',
              values: ['2', 'comercial', 'vendas', 'venda', 'area Comercial', 'área Comercial'],
              action: 'erxes.action.execute.action',
              value: '4',
            },
            {
              operator: '=',
              values: ['3', 'financeiro'],
              action: 'erxes.action.execute.action',
              value: '6',
            },
            {
              operator: '=',
              values: ['4', 'compras', 'setor de compras', 'nota fiscal'],
              action: 'erxes.action.execute.action',
              value: '8',
            },
          ],
        }),
      });

      await FlowActions.createFlowAction({
        order: 2,
        flowId: rootFlow.id,
        type: defineDepartmentType?.type,
        actionId: defineDepartmentType?.id,
        value: 'GjmmiGNcE2jwAnbTo',
      });

      await FlowActions.createFlowAction({
        order: 3,
        flowId: rootFlow.id,
        type: executeFlowType?.type,
        actionId: executeFlowType?.id,
        value: customerServiceFlow.id,
      });

      await FlowActions.createFlowAction({
        order: 4,
        flowId: rootFlow.id,
        type: defineDepartmentType?.type,
        actionId: defineDepartmentType?.id,
        value: 'pMujfwWwppGcG5nrM',
      });

      await FlowActions.createFlowAction({
        order: 5,
        flowId: rootFlow.id,
        type: executeFlowType?.type,
        actionId: executeFlowType?.id,
        value: commercialAreaFlow.id,
      });

      await FlowActions.createFlowAction({
        order: 6,
        flowId: rootFlow.id,
        type: defineDepartmentType?.type,
        actionId: defineDepartmentType?.id,
        value: 'ETB9Yk3vNPdKX6mmH',
      });

      await FlowActions.createFlowAction({
        order: 7,
        flowId: rootFlow.id,
        type: executeFlowType?.type,
        actionId: executeFlowType?.id,
        value: financialFlow.id,
      });

      await FlowActions.createFlowAction({
        order: 8,
        flowId: rootFlow.id,
        type: defineDepartmentType?.type,
        actionId: defineDepartmentType?.id,
        value: 'meiCSziaFLEFsBZ5x',
      });

      await FlowActions.createFlowAction({
        order: 9,
        flowId: rootFlow.id,
        type: executeFlowType?.type,
        actionId: executeFlowType?.id,
        value: purchasingSectorFlow.id,
      });

      await FlowActions.createFlowAction({
        order: 10,
        flowId: rootFlow.id,
        type: sendMessageType?.type,
        actionId: sendMessageType?.id,
        value: JSON.stringify({
          content: [
            'Que pena, mas neste momento não estamos em atendimento, <b>nosso horário de atendimento é das 09:00 às 18:00 de Segunda a Sábado.</b><br/><br/>' +
              'Mas fique tranquilo, deixe aqui sua mensagem de texto ou de voz que em breve algum amiguinho humano irá lhe retornar.<br/><br/>',
          ],
        }),
      });
    }

    if (!(await FlowActions.count({ flowId: customerServiceFlow.id }))) {
      await FlowActions.createFlowAction({
        order: 0,
        flowId: customerServiceFlow.id,
        type: askType?.type,
        actionId: askType?.id,
        value: JSON.stringify({
          content: [
            'Legal, por favor digite a opção desejada:' +
              '<br/><b>1</b> - Reclamações' +
              '<br/><b>2</b> - Duvidas' +
              '<br/><b>3</b> - Problemas com o Aplicativo' +
              '<br/><b>4</b> - Outros',
          ],
          conditions: [
            {
              operator: '=',
              values: ['1', '2', '3', '4', '5', '6', '7', '8', 'falar', 'atendente', 'atendimento'],
              action: 'erxes.action.transfer.to.agent',
              value: 'Muito obrigado, já abri um chamado aqui em breve um de nossos consultores irá entrar em contato.',
              error:
                'Que pena, mas neste momento estamos com todos os nossos atendentes ocupados.</b><br/><br/>' +
                'Mas fique tranquilo, deixe aqui sua mensagem de texto ou de voz que em breve algum amiguinho humano irá lhe retornar.<br/><br/>',
            },
          ],
        }),
      });
    }

    if (!(await FlowActions.count({ flowId: commercialAreaFlow.id }))) {
      await FlowActions.createFlowAction({
        order: 0,
        flowId: commercialAreaFlow.id,
        type: askType?.type,
        actionId: askType?.id,
        value: JSON.stringify({
          content: ['Por gentileza, qual seu nome?'],
          conditions: [
            {
              operator: '*',
              values: [],
              action: 'erxes.action.execute.action',
              value: '1',
            },
          ],
        }),
      });

      await FlowActions.createFlowAction({
        order: 1,
        flowId: commercialAreaFlow.id,
        type: askType?.type,
        actionId: askType?.id,
        value: JSON.stringify({
          content: [
            'Já possui cadastro conosco?' + '<br><br><b>1</b> - JÁ SOU CLIENTE' + '<br><br><b>2</b> - NÃO SOU CLIENTE',
          ],
          conditions: [
            {
              operator: '=',
              values: ['1', 'já sou cliente', 'sou cliente', 'tenho', 'sim', 'tenho cadastro'],
              action: 'erxes.action.execute.action',
              value: '2',
            },
            {
              operator: '=',
              values: ['2', 'não sou cliente', 'não sou', 'não tenho', 'não', 'não tenho cadastro'],
              action: 'erxes.action.execute.action',
              value: '3',
            },
          ],
        }),
      });

      await FlowActions.createFlowAction({
        order: 2,
        flowId: commercialAreaFlow.id,
        type: askType?.type,
        actionId: askType?.id,
        value: JSON.stringify({
          content: ['Qual seu CNPJ ou CPF?'],
          conditions: [
            {
              operator: '*',
              values: [],
              action: 'erxes.action.execute.action',
              value: '3',
            },
          ],
        }),
      });

      await FlowActions.createFlowAction({
        order: 3,
        flowId: commercialAreaFlow.id,
        type: transferToAgentType?.type,
        actionId: transferToAgentType?.id,
        value: JSON.stringify({
          value: 'Muito obrigado, Aguarde enquanto eu transfiro para um de nossos atendentes.',
          error:
            'Que pena, mas neste momento estamos com todos os nossos atendentes ocupados.</b><br/><br/>' +
            'Mas fique tranquilo, deixe aqui sua mensagem de texto ou de voz que em breve algum amiguinho humano irá lhe retornar.<br/><br/>',
        }),
      });
    }

    if (!(await FlowActions.count({ flowId: financialFlow.id }))) {
      await FlowActions.createFlowAction({
        order: 0,
        flowId: financialFlow.id,
        type: askType?.type,
        actionId: askType?.id,
        value: JSON.stringify({
          content: [
            'Legal, por favor digite a opção desejada:' +
              '<br/><b>1</b> - 2° Via do Boleto bancário' +
              '<br/><b>2</b> - Faturamento' +
              '<br/><b>3</b> - Cancelamento de Pedido' +
              '<br/><b>4</b> - Nota Fiscal/XML',
          ],
          conditions: [
            {
              operator: '=',
              values: [
                '1',
                'boleto',
                'segunda via',
                'segunda via boleto',
                '2ª via',
                '2ª via do boleto bancario',
                '2ª via do boleto bancário',
                'boleto bancário',
                'boleto bancario',
              ],
              action: 'erxes.action.execute.action',
              value: '1',
            },
            {
              operator: '=',
              values: ['2', 'faturamento', 'fatura'],
              action: 'erxes.action.execute.action',
              value: '2',
            },
            {
              operator: '=',
              values: ['3', 'cancelamento', 'cancelamento de pedido', 'cancelar de pedido', 'cancelar'],
              action: 'erxes.action.execute.action',
              value: '2',
            },
            {
              operator: '=',
              values: ['4', 'nota fiscal', 'nota', 'xml', 'nf', 'nfe', 'nf-e'],
              action: 'erxes.action.execute.action',
              value: '2',
            },
          ],
        }),
      });

      await FlowActions.createFlowAction({
        order: 1,
        flowId: financialFlow.id,
        type: askType?.type,
        actionId: askType?.id,
        value: JSON.stringify({
          content: ['Qual seu CNPJ ou CPF?'],
          conditions: [
            {
              operator: '*',
              values: [],
              action: 'erxes.action.execute.action',
              value: '2',
            },
          ],
        }),
      });

      await FlowActions.createFlowAction({
        order: 2,
        flowId: financialFlow.id,
        type: transferToAgentType?.type,
        actionId: transferToAgentType?.id,
        value: JSON.stringify({
          value: 'Muito obrigado, aguarde enquanto eu transfiro para um de nossos atendentes.',
          error:
            'Que pena, mas neste momento estamos com todos os nossos atendentes ocupados.</b><br/><br/>' +
            'Mas fique tranquilo, deixe aqui sua mensagem de texto ou de voz que em breve algum amiguinho humano irá lhe retornar.<br/><br/>',
        }),
      });
    }

    if (!(await FlowActions.count({ flowId: purchasingSectorFlow.id }))) {
      await FlowActions.createFlowAction({
        order: 0,
        flowId: purchasingSectorFlow.id,
        type: askType?.type,
        actionId: askType?.id,
        value: JSON.stringify({
          content: [
            'Legal, por favor digite a opção desejada:' +
              '<br/><b>1</b> - Cadastro de Fornecedor' +
              '<br/><b>2</b> - Transferir para atendimento',
          ],
          conditions: [
            {
              operator: '=',
              values: ['1', 'cadastro', 'cadastro fornecedor', 'cadastro de fornecedor'],
              action: 'erxes.action.execute.action',
              value: '9',
            },
            {
              operator: '=',
              values: ['2', 'transferir', 'falar', 'atendente', 'atendimento'],
              action: 'erxes.action.execute.action',
              value: '1',
            },
          ],
        }),
      });

      await FlowActions.createFlowAction({
        order: 1,
        flowId: purchasingSectorFlow.id,
        type: askType?.type,
        actionId: askType?.id,
        value: JSON.stringify({
          content: [
            'Por favor, para eu continuar com o atendimento preciso de algumas informações.' +
              '</br></br>Já possui cadastro conosco?' +
              '<br/><b>1</b> - Sim, sou fornecedor' +
              '<br/><b>2</b> - Não sou cadastrado',
          ],
          conditions: [
            {
              operator: '=',
              values: ['1', 'sim', 'sim, sou fornecedor', 'sou fornecedor', 'tenho'],
              action: 'erxes.action.execute.action',
              value: '2',
            },
            {
              operator: '=',
              values: ['2', 'não', 'não sou cadastrado', 'não sou', 'não tenho'],
              action: 'erxes.action.execute.action',
              value: '3',
            },
          ],
        }),
      });

      await FlowActions.createFlowAction({
        order: 2,
        flowId: purchasingSectorFlow.id,
        type: askType?.type,
        actionId: askType?.id,
        value: JSON.stringify({
          content: [
            'Por favor, para eu continuar com o atendimento preciso de algumas informações.' +
              '</br></br>Qual seu CNPJ ou CPF?',
          ],
          conditions: [
            {
              operator: '*',
              values: [],
              action: 'erxes.action.execute.action',
              value: '3',
            },
          ],
        }),
      });

      await FlowActions.createFlowAction({
        order: 3,
        flowId: purchasingSectorFlow.id,
        type: transferToAgentType?.type,
        actionId: transferToAgentType?.id,
        value: JSON.stringify({
          value: 'Muito obrigado, aguarde enquanto eu transfiro para um de nossos atendentes.',
          error:
            'Que pena, mas neste momento estamos com todos os nossos atendentes ocupados.</b><br/><br/>' +
            'Mas fique tranquilo, deixe aqui sua mensagem de texto ou de voz que em breve algum amiguinho humano irá lhe retornar.<br/><br/>',
        }),
      });
    }
  })

  .then(() => {
    return disconnect();
  })

  .then(() => {
    process.exit();
  });

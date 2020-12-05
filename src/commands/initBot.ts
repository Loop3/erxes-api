import { connect, disconnect } from '../db/connection';
import { FlowActionTypes, Flows, FlowActions } from '../db/models';

connect()
  .then(async () => {
    let rootFlow = await Flows.findOne({ name: 'Root' });

    if (!rootFlow) {
      rootFlow = await Flows.createFlow({
        assignedUserId: 'mexGE3sRQ3sBzNRAT',
        name: 'Root',
        description: '',
      });
    }

    let customerServiceFlow = await Flows.findOne({ name: 'Customer service' });

    if (!customerServiceFlow) {
      customerServiceFlow = await Flows.createFlow({
        assignedUserId: 'mexGE3sRQ3sBzNRAT',
        name: 'Customer service',
        description: '',
      });
    }

    let commercialAreaFlow = await Flows.findOne({ name: 'Commercial area' });

    if (!commercialAreaFlow) {
      commercialAreaFlow = await Flows.createFlow({
        assignedUserId: 'mexGE3sRQ3sBzNRAT',
        name: 'Commercial area',
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
              '<br/>Estou aqui para ajudá-lo a ter um atendimento mais rápido e objetivo.<br/>' +
              '<br/>Vamos começar?<br/>' +
              '<br/>Primeiro Selecione a opção desejada digitando uma das opções a baixo:<br/>' +
              '<br/><b>1</b> - Suporte' +
              '<br/><b>2</b> - Comercial',
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
          ],
        }),
      });

      await FlowActions.createFlowAction({
        order: 2,
        flowId: rootFlow.id,
        type: defineDepartmentType?.type,
        actionId: defineDepartmentType?.id,
        value: '2BMnHkXaBJdbYbWTH',
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
        value: '4Ma7nSCHZ63bfdgsj',
      });

      await FlowActions.createFlowAction({
        order: 5,
        flowId: rootFlow.id,
        type: executeFlowType?.type,
        actionId: executeFlowType?.id,
        value: commercialAreaFlow.id,
      });

      await FlowActions.createFlowAction({
        order: 10,
        flowId: rootFlow.id,
        type: sendMessageType?.type,
        actionId: sendMessageType?.id,
        value: JSON.stringify({
          content: [
            'Que pena, mas neste momento não estamos em atendimento, <b>nosso horário de atendimento é das 09:00 às 18:00 de Segunda a Sábado.</b><br/>' +
              'Mas fique tranquilo, deixe aqui sua mensagem de texto ou de voz que em breve algum amiguinho humano irá lhe retornar.',
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
              value:
                'Muito obrigado, já abri um chamado aqui e em breve um de nossos atendentes irá entrar em contato.',
              error:
                'Que pena, mas neste momento estamos com todos os nossos atendentes ocupados<br/>' +
                'Mas fique tranquilo, deixe aqui sua mensagem de texto ou de voz que em breve algum atendentes irá lhe retornar.',
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
              action: 'erxes.action.transfer.to.agent',
              value:
                'Muito obrigado, já abri um chamado aqui e em breve um de nossos consultores irá entrar em contato.',
              error:
                'Que pena, mas neste momento estamos com todos os nossos consultores ocupados<br/>' +
                'Mas fique tranquilo, deixe aqui sua mensagem de texto ou de voz que em breve algum consultores irá lhe retornar.',
            },
          ],
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

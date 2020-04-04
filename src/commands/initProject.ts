import { connect, disconnect } from '../db/connection';
import { Users, FlowActionTypes, Flows, FlowActions } from '../db/models';

connect()
  .then(async () => {
    // generate random password
    const generator = require('generate-password');
    const newPwd = generator.generate({
      length: 10,
      numbers: true,
      lowercase: true,
      uppercase: true,
    });

    // create admin user
    let user = await Users.findOne({ isOwner: true });

    if (!user) {
      user = await Users.createUser({
        username: 'admin',
        password: newPwd,
        email: 'admin@erxes.io',
        isOwner: true,
        details: {
          fullName: 'Admin',
        },
      });

      console.log('\x1b[32m%s\x1b[0m', 'Your new password: ' + newPwd);

      return Users.findOne({ _id: user._id });
    }

    return;
  })

  .then(async () => {
    let flowActionTypes = await FlowActionTypes.find({});

    if (!flowActionTypes || !flowActionTypes.length) {
      flowActionTypes = [
        'erxes.action.root',
        'erxes.action.define.department',
        'erxes.action.define.tabulation',
        'erxes.action.transfer.to.agent',
        'erxes.action.put.in.queue',
        'erxes.action.finish.attendance',
        'erxes.action.auto.distribute',
        'erxes.action.define.bot',
        'erxes.action.define.tags',
        'erxes.action.add.tags',
        'erxes.action.send.message',
        'erxes.action.send.template.message',
        'erxes.action.dispatch.to.app',
        'erxes.action.send.sms',
        'erxes.action.define.timeout',
        'erxes.action.send.internal.message',
        'erxes.action.execute.autmations.flow',
        'erxes.action.execute.action',
        'erxes.action.conditional',
        'erxes.action.wait.for.interaction',
        'erxes.action.define.workflow',
        'erxes.action.send.feedback',
        'erxes.action.add.comment.timeline',
        'erxes.action.choose.department',
        'erxes.action.to.ask',
        'erxes.action.send.request',
        'erxes.action.send.email',
        'erxes.action.send.file',
        'erxes.action.execute.javascript',
        'erxes.action.define.virtual.agent',
        'erxes.action.pause',
      ].map(type => new FlowActionTypes({ type, createdAt: new Date() }));

      return FlowActionTypes.insertMany(flowActionTypes);
    }
  })

  .then(async () => {
    let rootFlow = await Flows.findOne({ name: 'Root' });

    if (!rootFlow) {
      rootFlow = await Flows.createFlow({
        assignedUserId: 'wJjxQipSXXHbNyqFZ',
        name: 'Root',
        description: '',
      });
    }

    let secondFlow = await Flows.findOne({ name: 'Second' });

    if (!secondFlow) {
      secondFlow = await Flows.createFlow({
        assignedUserId: 'wJjxQipSXXHbNyqFZ',
        name: 'Second',
        description: '',
      });
    }

    const askType = await FlowActionTypes.findOne({
      type: 'erxes.action.to.ask',
    });

    const sendMessageType = await FlowActionTypes.findOne({
      type: 'erxes.action.send.message',
    });

    const defineDepartmenType = await FlowActionTypes.findOne({
      type: 'erxes.action.define.department',
    });

    const executeFlowType = await FlowActionTypes.findOne({
      type: 'erxes.action.execute.autmations.flow',
    });

    if (!(await FlowActions.count({ flowId: rootFlow.id }))) {
      await FlowActions.createFlowAction({
        order: 0,
        type: askType?.type,
        flowId: rootFlow.id,
        actionId: askType?.id,
        value: JSON.stringify({
          content: [
            'Olá, tudo bem?' +
              '<br/>Muito bom vê-lo aqui! 😊<br/>' +
              '<br/>Bom, para agilizar seu atendimento, por favor digite a opção desejada:' +
              '<br/><b>1</b> - Ainda não sou cliente, quero falar com o Comercial.' +
              '<br/><b>2</b> - Já sou cliente, quero falar com o Suporte pois tenho dúvidas ou preciso de algo',
          ],
          conditions: [
            {
              operator: '=',
              values: ['1', 'comercial', 'vendas', 'venda'],
              action: 'erxes.action.execute.action',
              value: '1',
            },
            {
              operator: '=',
              values: ['2', 'suporte'],
              action: 'erxes.action.execute.action',
              value: '3',
            },
          ],
        }),
      });

      await FlowActions.createFlowAction({
        order: 1,
        flowId: rootFlow.id,
        type: defineDepartmenType?.type,
        actionId: defineDepartmenType?.id,
        value: 'Rs8GERDMd4PK5xnKv',
      });

      await FlowActions.createFlowAction({
        order: 2,
        flowId: rootFlow.id,
        type: executeFlowType?.type,
        actionId: executeFlowType?.id,
        value: secondFlow.id,
      });

      await FlowActions.createFlowAction({
        order: 3,
        flowId: rootFlow.id,
        type: defineDepartmenType?.type,
        actionId: defineDepartmenType?.id,
        value: 'RybHspzXFcc2GPtG4',
      });

      await FlowActions.createFlowAction({
        order: 4,
        flowId: rootFlow.id,
        type: executeFlowType?.type,
        actionId: executeFlowType?.id,
        value: secondFlow.id,
      });
    }

    if (!(await FlowActions.count({ flowId: secondFlow.id }))) {
      await FlowActions.createFlowAction({
        order: 0,
        flowId: secondFlow.id,
        type: askType?.type,
        actionId: askType?.id,
        value: JSON.stringify({
          content: [
            '<br/>Legal, por favor digite a opção desejada:' +
              '<br/><b>1</b> - Informações sobre MEI e nossos serviços' +
              '<br/><b>2</b> - Falar com um atendente',
          ],
          conditions: [
            {
              operator: '=',
              values: [
                '1',
                'mei',
                'servicos',
                'serviços',
                'servico',
                'serviço',
                'info',
                'informações',
                'informacoes',
                'infos',
                'sobre',
              ],
              action: 'erxes.action.execute.action',
              value: '1',
            },
            {
              operator: '=',
              values: ['2', 'falar', 'atendente', 'atendimento'],
              action: 'erxes.action.transfer.to.agent',
              value: '',
            },
          ],
        }),
      });

      await FlowActions.createFlowAction({
        order: 1,
        flowId: secondFlow.id,
        type: sendMessageType?.type,
        actionId: sendMessageType?.id,
        value: JSON.stringify({
          content: [
            'Para saber mais sobre MEI e nossos serviços acesse: <br/>' + 'https://dues.gpages.com.br/pagina-captura',
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

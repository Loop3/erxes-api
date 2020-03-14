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

    let user = await Users.findOne({ email: 'admin@erxes.io' });

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

    return;
  })

  .then(async () => {
    let flow = await Flows.createFlow({
      assignedUserId: 'wJjxQipSXXHbNyqFZ',
      name: 'Teste',
      description: 'Flow de teste',
    });

    const sendMessageType = await FlowActionTypes.findOne({
      type: 'erxes.action.send.message',
    });
    const askType = await FlowActionTypes.findOne({
      type: 'erxes.action.to.ask',
    });

    await FlowActions.createFlowAction({
      order: 0,
      type: sendMessageType?.type,
      flowId: flow.id,
      actionId: sendMessageType?.id,
      value: JSON.stringify({
        content: [
          'Bem vindo, este é um teste de automação do WhatsBot, converse com o bot respondendo as perguntas que receber',
          'Olá, converse com o bot respondendo as perguntas que receber',
        ],
      }),
    });

    await FlowActions.createFlowAction({
      order: 1,
      type: askType?.type,
      flowId: flow.id,
      actionId: askType?.id,
      value: JSON.stringify({
        content: [
          'Com qual setor você gostaria de conversar? 1 - Administrativo 2 - Financeiro - 3 - Sobre',
          'Escolha abaixo o setor que melhor lhe atente? 1 - Administrativo 2 - Financeiro - 3 - Sobre',
        ],
        conditions: [
          {
            operator: '=',
            values: ['1', 'administrativo', 'adm'],
            action: 'erxes.action.choose.department',
            value: 'Administrativo',
          },
          {
            operator: '=',
            values: ['2', 'financeiro'],
            action: 'erxes.action.choose.department',
            value: 'Financeiro',
          },
          {
            operator: '=',
            values: ['3', 'sobre'],
            action: 'erxes.action.execute.action',
            value: '2',
          },
        ],
      }),
    });

    await FlowActions.createFlowAction({
      order: 2,
      type: sendMessageType?.type,
      flowId: flow.id,
      actionId: sendMessageType?.id,
      value: JSON.stringify({
        content: ['Este é um teste de automação do WhatsBot'],
      }),
    });
  })

  .then(() => {
    return disconnect();
  })

  .then(() => {
    process.exit();
  });

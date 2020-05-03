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
        assignedUserId: 'XenYe8QirmuiMdCoM',
        name: 'Root',
        description: '',
      });
    }

    let secondFlow = await Flows.findOne({ name: 'Second' });

    if (!secondFlow) {
      secondFlow = await Flows.createFlow({
        assignedUserId: 'XenYe8QirmuiMdCoM',
        name: 'Second',
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

    const defineDepartmenType = await FlowActionTypes.findOne({
      type: 'erxes.action.define.department',
    });

    const executeFlowType = await FlowActionTypes.findOne({
      type: 'erxes.action.execute.autmations.flow',
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
              value: '6',
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
              '<br/>Eu sou a Duda, assistente virtual da DUES! 😃<br/>' +
              '<br/>Estou aqui para ajudá-lo a ter um atendimento mais rápido e objetivo.<br/>' +
              '<br/>Vamos começar?<br/>' +
              '<br/>Primeiro selecione a opção desejada digitando 1 ou 2.🤝<br/>' +
              '<br/>1. <b>JÁ SOU CLIENTE</b> - Preciso de ajuda ou tirar dúvidas.' +
              '<br/>2. <b>NÃO SOU CLIENTE</b> - Quero saber mais informações sobre formalização de trabalho autônomo através do MEI e ou sobre os serviços da DUES para MEI',
          ],
          conditions: [
            {
              operator: '=',
              values: ['1', 'suporte', 'ajuda', 'duvidas'],
              action: 'erxes.action.execute.action',
              value: '2',
            },
            {
              operator: '=',
              values: ['2', 'comercial', 'vendas', 'venda', 'formalização', 'mei'],
              action: 'erxes.action.execute.action',
              value: '4',
            },
          ],
        }),
      });

      await FlowActions.createFlowAction({
        order: 2,
        flowId: rootFlow.id,
        type: defineDepartmenType?.type,
        actionId: defineDepartmenType?.id,
        value: 'ikWdCxM9Dmr8nMCMy',
      });

      await FlowActions.createFlowAction({
        order: 3,
        flowId: rootFlow.id,
        type: executeFlowType?.type,
        actionId: executeFlowType?.id,
        value: secondFlow.id,
      });

      await FlowActions.createFlowAction({
        order: 4,
        flowId: rootFlow.id,
        type: defineDepartmenType?.type,
        actionId: defineDepartmenType?.id,
        value: 'HDDNCHv2fyEghrFYA',
      });

      await FlowActions.createFlowAction({
        order: 5,
        flowId: rootFlow.id,
        type: transferToAgentType?.type,
        actionId: transferToAgentType?.id,
        value: JSON.stringify({
          value: 'Obrigado pelas informações, aguarde um minuto que estamos transferindo você para a(o) {{shortName}}',
          error:
            'Ops!!<br/><br/>' +
            'Neste momento estamos com todos os nossos atendentes ocupados.<br/><br/>' +
            'Mas registre aqui o que precisa por mensagem ou áudio, que o responderemos o mais rápido possível, no máximo em 3 horas, mas normalmente antes.<br/><br/>' +
            'Agradecemos seu contato, ele é muito importante para nós.<br/><br/>' +
            'Até breve! 😊<br/>' +
            'Equipe Dues',
        }),
      });

      await FlowActions.createFlowAction({
        order: 6,
        flowId: rootFlow.id,
        type: sendMessageType?.type,
        actionId: sendMessageType?.id,
        value: JSON.stringify({
          content: [
            'Olá, tudo bem?<br/><br/>' +
              'Bom, neste momento não estamos ONLINE pois o nosso <b>horário de atendimento é das 09:00 às 18:00, exceto sábados, domingos e feriados.</b><br/><br/>' +
              'Mas fique tranquilo, deixe aqui sua mensagem de texto ou de voz que assim que retornarmos o responderemos.<br/><br/>' +
              '<b>Lembramos que nosso atendimento é somente ONLINE, ou seja, somente através de mensagens por aplicativos ou e-mails, mas caso necessário e em situações pontuais, nós ligaremos para você.</b><br/><br/>' +
              'Até breve! 😊<br/>' +
              'Equipe Dues',
          ],
        }),
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
              '<br/><b>1</b>. Minha MEI (Impostos, Alterações, Guias etc.);' +
              '<br/><b>2</b>. Declaração de Renda;' +
              '<br/><b>3</b>. Seguro de Vida;' +
              '<br/><b>4</b>. Imposto de Renda de Pessoa Física (IRPF);' +
              '<br/><b>5</b>. Suporte para acesso a Financiamentos;' +
              '<br/><b>6</b>. Suporte para acesso a Planos de Saúde , Odontológicos e Seguros;' +
              '<br/><b>7</b>. Suporte para acesso a serviços do INSS (esta doente ou se acidentou);' +
              '<br/><b>8</b>. Nenhum dos assuntos acima;',
          ],
          conditions: [
            {
              operator: '=',
              values: ['1', '2', '3', '4', '5', '6', '7', '8', 'falar', 'atendente', 'atendimento'],
              action: 'erxes.action.transfer.to.agent',
              value:
                'Obrigado pelas informações, aguarde um minuto que estamos transferindo você para a(o) {{shortName}}',
              error:
                'Ops!!<br/><br/>' +
                'Neste momento estamos com todos os nossos atendentes ocupados.<br/><br/>' +
                'Mas registre aqui o que precisa por mensagem ou áudio, que o responderemos o mais rápido possível, no máximo em 3 horas, mas normalmente antes.<br/><br/>' +
                'Agradecemos seu contato, ele é muito importante para nós.<br/><br/>' +
                'Até breve! 😊<br/>' +
                'Equipe Dues',
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

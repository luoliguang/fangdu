const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { BotConversationService, validSessionId } = require('../services/BotConversationService');
const FeedbackService = require('../services/FeedbackService');
const larkModule = require('../services/LarkNotifyService');

const uid = randomUUID();

function setup(decision) {
  const calls = [];
  const feedbacks = [];
  const bot = { async summarizeFeedback(items) { calls.push(items); if (decision instanceof Error) throw decision; return decision; } };
  const feedback = { async submitFeedback(data, _info, options) { feedbacks.push({ data, options }); } };
  return { sessions: new BotConversationService(bot, feedback, { idleMs: 2000 }), calls, feedbacks };
}

test('a conversation summarizes several feedback turns into one notification and finishes only once', async () => {
  const { sessions, calls, feedbacks } = setup({ notify: true, topic: '素材需求', summary: '用户希望增加涤纶运动面料，偏深绿色' });
  const id = randomUUID();
  sessions.record({ sessionId: id, userId: uid, topicLabel: '想要新素材', message: '想做涤纶运动面料' });
  sessions.record({ sessionId: id, userId: uid, message: '最好是深绿色' });
  assert.deepEqual(await Promise.all([sessions.finish(id), sessions.finish(id)]), [true, false]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].length, 2);
  assert.equal(feedbacks.length, 1);
  assert.equal(feedbacks[0].data.message, '【素材需求】用户希望增加涤纶运动面料，偏深绿色');
  assert.equal(feedbacks[0].data.user_id, uid);
  assert.equal(feedbacks[0].options, undefined, 'summary uses normal feedback notification once');
});

test('ordinary chat is not submitted even if it came from a topic chip', async () => {
  const { sessions, feedbacks } = setup({ notify: false });
  const id = randomUUID();
  sessions.record({ sessionId: id, userId: uid, topicLabel: '其他想说的', message: '你能做什么' });
  assert.equal(await sessions.finish(id), false);
  assert.equal(feedbacks.length, 0);
  assert.equal(sessions.sessions.size, 0);
});

test('plain photo searches are never classified as feedback', async () => {
  const { sessions, calls, feedbacks } = setup({ notify: true, topic: '素材需求', summary: '误判' });
  const id = randomUUID();
  sessions.record({ sessionId: id, userId: uid, message: '怎么搜索实拍图' });
  sessions.record({ sessionId: id, userId: uid, message: '我想找蓝色条纹图片' });
  assert.equal(await sessions.finish(id), false);
  assert.equal(calls.length, 0);
  assert.equal(feedbacks.length, 0);
});

test('classifier outage preserves explicit feedback in admin list without sending Lark', async () => {
  const { sessions, feedbacks } = setup(new Error('upstream unavailable'));
  const id = randomUUID();
  sessions.record({ sessionId: id, userId: uid, topicLabel: '网站有问题', message: '搜索按钮点击没反应' });
  assert.equal(await sessions.finish(id), false);
  assert.equal(feedbacks.length, 1);
  assert.equal(feedbacks[0].data.message, '【网站有问题】搜索按钮点击没反应');
  assert.deepEqual(feedbacks[0].options, { notify: false });
});

test('idle timeout automatically finalizes a session once', async () => {
  let resolveSummary;
  const summarized = new Promise(resolve => { resolveSummary = resolve; });
  const bot = { async summarizeFeedback(items) { resolveSummary(items); return { notify: false }; } };
  const sessions = new BotConversationService(bot, { submitFeedback: async () => { throw new Error('unexpected feedback'); } }, { idleMs: 15 });
  const id = randomUUID();
  sessions.record({ sessionId: id, message: '希望新增蓝色条纹实拍图' });
  let timeout;
  const items = await Promise.race([
    summarized,
    new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('idle summary did not run')), 1000); })
  ]);
  clearTimeout(timeout);
  assert.equal(items.length, 1);
  assert.equal(sessions.sessions.size, 0);
});

test('quiet feedback is stored without notifying Lark; regular feedback still notifies', async t => {
  let notices = 0;
  const original = larkModule.getShared;
  larkModule.getShared = () => ({ notifyFeedback: () => { notices++; } });
  t.after(() => { larkModule.getShared = original; });
  const service = new FeedbackService({});
  service.feedbackModel.create = async data => ({ id: 1, ...data, created_at: 'test' });
  await service.submitFeedback({ message: '请求增加涤纶面料', user_id: uid }, {}, { notify: false });
  assert.equal(notices, 0);
  await service.submitFeedback({ message: '网站有个问题', user_id: uid });
  assert.equal(notices, 1);
});

test('invalid IDs and overlong messages cannot create sessions; history is bounded', async () => {
  const { sessions, calls } = setup({ notify: false });
  sessions.record({ sessionId: 'guessed', message: 'hi' });
  sessions.record({ sessionId: randomUUID(), message: 'x'.repeat(1001) });
  assert.equal(sessions.sessions.size, 0);
  assert.equal(validSessionId('guessed'), false);
  const id = randomUUID();
  for (let i = 0; i < 15; i++) sessions.record({ sessionId: id, message: `test-${i}`, topicLabel: i === 0 ? '想要新素材' : '' });
  await sessions.finish(id);
  assert.equal(calls[0].length, 12);
  assert.equal(calls[0][0].message, 'test-0');
  assert.equal(calls[0][11].message, 'test-14');
});

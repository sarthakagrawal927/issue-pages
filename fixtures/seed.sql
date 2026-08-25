-- Local development only. Every visible entry is explicitly sample content.
INSERT OR REPLACE INTO authors
  (github_id, login, avatar_url, github_url, created_at, updated_at)
VALUES
  (9001, 'octocat', 'https://avatars.githubusercontent.com/u/583231?v=4', 'https://github.com/octocat', '2026-08-20T09:00:00.000Z', '2026-08-25T09:00:00.000Z'),
  (9002, 'hubot', 'https://avatars.githubusercontent.com/u/480938?v=4', 'https://github.com/hubot', '2026-08-20T09:00:00.000Z', '2026-08-25T09:00:00.000Z');

INSERT OR REPLACE INTO articles
  (issue_id, issue_number, repository_id, author_id, title, slug, body_markdown,
   body_html, body_text, excerpt, github_url, github_created_at, github_updated_at,
   state, visibility, reactions_json, published_at, last_public_at, public_revision)
VALUES
  (1001, 42, 1345783913, 9001, '[Sample] A field note from the open web',
   'sample-a-field-note-from-the-open-web',
   '**Sample content.** This local fixture shows how a public page reads after a GitHub issue passes review.\n\n## Why this shape?\n\nThe issue number stays permanent while the title and conversation can keep moving.',
   '<p><strong>Sample content.</strong> This local fixture shows how a public page reads after a GitHub issue passes review.</p><h2>Why this shape?</h2><p>The issue number stays permanent while the title and conversation can keep moving.</p>',
   'Sample content. This local fixture shows how a public page reads after a GitHub issue passes review. Why this shape? The issue number stays permanent while the title and conversation can keep moving.',
   'Sample content showing how a public page reads after a GitHub issue passes review.',
   'https://github.com/sarthakagrawal927/issue-pages/issues/42',
   '2026-08-21T10:00:00.000Z', '2026-08-25T11:20:00.000Z', 'open', 'published',
   '{"heart":4,"eyes":2}', '2026-08-21T10:00:00.000Z', '2026-08-25T11:25:00.000Z', 5),
  (1002, 43, 1345783913, 9002, '[Sample] Small tools should leave a trace',
   'sample-small-tools-should-leave-a-trace',
   'Small tools should leave a trace.\n\nSample local content.',
   '<p><strong>Sample content.</strong> Small tools can stay understandable when their source, authorship, and discussion remain visible.</p>',
   'Sample content. Small tools can stay understandable when their source, authorship, and discussion remain visible.',
   'Sample content about visible source, authorship, and discussion.',
   'https://github.com/sarthakagrawal927/issue-pages/issues/43',
   '2026-08-22T12:00:00.000Z', '2026-08-24T17:10:00.000Z', 'open', 'published',
   '{"rocket":3}', '2026-08-22T12:00:00.000Z', '2026-08-24T17:10:00.000Z', 2),
  (1003, 44, 1345783913, 9001, '[Sample] Notes from a finished experiment',
   'sample-notes-from-a-finished-experiment',
   'This sample page is archived.',
   '<p><strong>Sample content.</strong> This page demonstrates the archived state of a closed source issue.</p>',
   'Sample content. This page demonstrates the archived state of a closed source issue.',
   'Sample content demonstrating an archived page.',
   'https://github.com/sarthakagrawal927/issue-pages/issues/44',
   '2026-08-23T08:30:00.000Z', '2026-08-23T18:00:00.000Z', 'closed', 'published',
   '{}', '2026-08-23T08:30:00.000Z', '2026-08-23T18:00:00.000Z', 2);

INSERT OR REPLACE INTO article_slugs (article_id, slug, created_at) VALUES
  (1001, 'sample-a-field-note-from-the-open-web', '2026-08-21T10:00:00.000Z'),
  (1002, 'sample-small-tools-should-leave-a-trace', '2026-08-22T12:00:00.000Z'),
  (1003, 'sample-notes-from-a-finished-experiment', '2026-08-23T08:30:00.000Z');

INSERT OR REPLACE INTO labels (github_id, name, slug, color, description, updated_at) VALUES
  (7001, 'field-notes', 'field-notes', 'd3aa36', 'Notes gathered in public.', '2026-08-25T09:00:00.000Z'),
  (7002, 'open-web', 'open-web', '315f49', 'Pages about the open web.', '2026-08-25T09:00:00.000Z');

INSERT OR REPLACE INTO article_labels (article_id, label_id) VALUES
  (1001, 7001), (1001, 7002), (1002, 7002), (1003, 7001);

INSERT OR REPLACE INTO comments
  (github_id, article_id, author_id, body_markdown, body_html, body_text, github_url,
   github_created_at, github_updated_at, reactions_json, public_revision, deleted_at)
VALUES
  (6001, 1001, 9002, 'The permanent issue number is the useful part.',
   '<p>The permanent issue number is the useful part. <strong>Sample reply.</strong></p>',
   'The permanent issue number is the useful part. Sample reply.',
   'https://github.com/sarthakagrawal927/issue-pages/issues/42#issuecomment-6001',
   '2026-08-25T11:20:00.000Z', '2026-08-25T11:20:00.000Z', '{"+1":2}', 1, NULL);

DELETE FROM article_search;
INSERT INTO article_search (article_id, title, body, author, labels, comments)
SELECT CAST(a.issue_id AS TEXT), a.title, a.body_text, au.login,
  COALESCE((SELECT group_concat(l.name, ' ') FROM article_labels al JOIN labels l ON l.github_id = al.label_id WHERE al.article_id = a.issue_id), ''),
  COALESCE((SELECT group_concat(c.body_text, ' ') FROM comments c WHERE c.article_id = a.issue_id AND c.deleted_at IS NULL), '')
FROM articles a JOIN authors au ON au.github_id = a.author_id
WHERE a.visibility = 'published';

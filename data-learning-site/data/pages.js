// The About, Privacy, Contact and Roadmap pages. Edit the words here; no other file needs to change.
window.SITE = { email: 'danika.builds@gmail.com', portfolio: 'https://danikabuilds.github.io', updated: '19 November 2026' };

window.PAGES = {
  about: {
    title: 'About',
    html: function () {
      return '<h1>About The Joinery</h1>' +
        '<p class="lede">A free place to practise data skills in your browser, with no sign-up and no paywall.</p>' +
        '<h2>Why it exists</h2>' +
        '<p>I’m Danika, a data professional in Cape Town. While building my own skills and preparing for interviews, I kept running into paywalls: free trials that stopped halfway, and the good practice sitting behind a subscription. The Joinery is what I wished I had found.</p>' +
        '<p>A joiner makes pieces fit together. Data work is the same: tables, questions and answers that have to fit.</p>' +
        '<h2>What is here</h2>' +
        '<ul>' +
        '<li><strong>SQL lab:</strong> ' + window.EXERCISES.length + ' exercises that run in your browser, with hints and a model answer.</li>' +
        '<li><strong>Glossary:</strong> ' + window.GLOSSARY.length + ' data terms in six areas, each with a deeper explanation, business questions and a sentence you can say in an interview.</li>' +
        '<li><strong>Review and quizzes:</strong> spaced reviews, a mixed quiz, topic quizzes and subject quizzes.</li>' +
        '<li><strong>Dialects:</strong> SQLite, PostgreSQL, SQL Server and BigQuery side by side.</li>' +
        '<li><strong>Say it out loud:</strong> timed spoken explanations, because explaining an answer is a skill of its own.</li>' +
        '</ul>' +
        '<h2>Good to know</h2>' +
        '<ul>' +
        '<li>It is free, with no accounts and no ads.</li>' +
        '<li>The practice data is made up. It is shaped like the Olist online-shop dataset, but no real customers are in it.</li>' +
        '<li>Byte the beetle gives scripted tips. Byte is not an AI chatbot.</li>' +
        '<li>This is a side project, built carefully but by one person. If something is wrong, <a href="#/contact">tell me</a>.</li>' +
        '</ul>' +
        '<p>My other work is on <a href="' + window.SITE.portfolio + '">my portfolio</a>.</p>';
    }
  },

  privacy: {
    title: 'Privacy',
    html: function () {
      return '<h1>Privacy</h1>' +
        '<p class="lede">In short: no accounts, no tracking and no ads. What you type stays on your device.</p>' +
        '<h2>What is saved, and where</h2>' +
        '<p>Your progress, draft answers, settings and light or dark choice are saved in this browser, on your device, so the site remembers where you were. They are never sent to me or to anyone else. You can clear them with “Reset my progress” in the footer, or by clearing this site’s data in your browser settings. “Export my progress” and “Import progress” let you move them to another browser yourself.</p>' +
        '<h2>Your SQL</h2>' +
        '<p>Queries run inside your browser, on the practice data. The text you write is not sent anywhere.</p>' +
        '<h2>What the site does not do</h2>' +
        '<ul>' +
        '<li>No analytics and no advertising scripts.</li>' +
        '<li>No sign-up, so no name, email or password is collected.</li>' +
        '<li>The fonts and code libraries are served from the site itself, not from other companies’ servers.</li>' +
        '</ul>' +
        '<h2>Hosting</h2>' +
        '<p>The site is hosted on GitHub Pages. As with any web host, GitHub may keep standard server records, such as visitors’ IP addresses. I add no tracking of my own and I do not collect visitor data.</p>' +
        '<h2>If you email me</h2>' +
        '<p>I receive your address and message, and I use them only to reply. I will not add you to a list or share them.</p>' +
        '<p class="meta">Last updated ' + window.SITE.updated + '.</p>';
    }
  },

  contact: {
    title: 'Contact',
    html: function () {
      var e = window.SITE.email;
      function mail(subject, body) { return 'mailto:' + e + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body); }
      return '<h1>Contact</h1>' +
        '<p class="lede">Found a mistake, or want a topic covered? I read everything.</p>' +
        '<p class="contact-actions">' +
        '<a class="btn primary" href="' + mail('The Joinery: mistake report', 'Page:\n\nWhat I saw:\n\nWhat I expected:\n') + '" data-mistake>Report a mistake</a> ' +
        '<a class="btn" href="' + mail('The Joinery: topic request', 'The topic I would like covered:\n\nWhy it would help:\n') + '">Request a topic</a> ' +
        '<a class="btn" href="' + mail('Hello from The Joinery', '') + '">Say hello</a></p>' +
        '<p>Or write to <a href="mailto:' + e + '">' + e + '</a>.</p>' +
        '<h2>A useful mistake report</h2>' +
        '<ul><li>The page or exercise it happened on.</li><li>What you saw, and what you expected instead.</li><li>Your browser, if the site misbehaved.</li></ul>' +
        '<p>This is a side project, so replies can take a few days. Your message is used only to reply (see <a href="#/privacy">Privacy</a>).</p>';
    }
  },

  roadmap: {
    title: 'Roadmap',
    html: function () {
      return '<h1>Roadmap</h1>' +
        '<p class="lede">What is built, and what I am thinking about next. No dates are promised.</p>' +
        '<h2>Built so far</h2>' +
        '<ul>' +
        '<li>SQL lab with ' + window.EXERCISES.length + ' exercises across seven topics.</li>' +
        '<li>Glossary with ' + window.GLOSSARY.length + ' terms, flashcards and business questions.</li>' +
        '<li>Spaced review, a mixed quiz, topic quizzes and subject quizzes.</li>' +
        '<li>Dialects: compare and translate.</li>' +
        '<li>Say-it-out-loud practice, a progress dashboard, and settings for text size and timers.</li>' +
        '</ul>' +
        '<h2>Ideas I am exploring</h2>' +
        '<p>In no fixed order:</p>' +
        '<ul>' +
        '<li>A quick skills check that suggests where to start.</li>' +
        '<li>Daily questions and interview scenarios to answer out loud.</li>' +
        '<li>Light Python practice for working with data.</li>' +
        '<li>More practice datasets.</li>' +
        '<li>Dashboard and business-intelligence practice.</li>' +
        '<li>Data engineering lessons on pipelines and the cloud.</li>' +
        '</ul>' +
        '<p>Want something moved up the list? <a href="#/contact">Request a topic</a>.</p>';
    }
  }
};

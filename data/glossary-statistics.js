// Statistics terms. See data/glossary.js for what each field means.
window.addGlossary('Statistics', [
  {
    id: 'mean-vs-median', term: 'Mean vs median',
    def: 'The mean is the sum divided by the count. The median is the middle value when sorted.',
    deep: 'With skewed data, such as order values or delivery times, a few large values pull the mean up while the median stays put. Report the median as the "typical" value and the mean when totals matter (mean times count equals the total).',
    ex: 'Delivery days: 3, 4, 4, 5, 40. Mean = 11.2, median = 4.',
    questions: ['What does a typical customer actually experience?'],
    say: 'The mean is pulled by extreme values; the median is the middle. For skewed data like delivery times, I report the median as typical.',
    rel: ['outlier', 'distribution', 'percentile']
  },
  {
    id: 'distribution', term: 'Distribution',
    def: 'The shape of how values are spread: where most sit, how wide they range, and whether one tail is long.',
    deep: 'Look before you summarise. A histogram shows whether data is symmetric, skewed (most money data is right-skewed), has two peaks (two kinds of customers mixed together), or has a pile-up at zero.',
    questions: ['Are most customers small spenders with a few very large ones?'],
    say: 'I look at the distribution with a histogram before choosing a summary, because skew or two peaks change which number is honest.',
    rel: ['mean-vs-median', 'variance', 'outlier']
  },
  {
    id: 'variance', term: 'Variance and standard deviation',
    def: 'Measures of spread: how far values typically sit from the mean.',
    deep: 'Standard deviation is the square root of variance, in the original units. Two stores can have the same average daily sales but very different spread; the one with high spread needs more safety stock. For skewed data, the interquartile range (25th to 75th percentile) is a sturdier measure.',
    questions: ['How predictable are daily orders, so we can plan staff?'],
    say: 'Standard deviation measures spread around the mean. Two things with the same average can be very different in how reliable they are.',
    rel: ['distribution', 'percentile', 'confidence-interval']
  },
  {
    id: 'percentile', term: 'Percentile',
    def: 'The value below which a given share of the data falls. The 90th percentile is higher than 90% of values.',
    deep: 'Percentiles describe experience better than averages: "90% of orders arrive within 9 days" is a promise customers understand. The 50th percentile is the median.',
    ex: 'SQL Server and PostgreSQL: PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY delivery_days)',
    exCode: true,
    questions: ['What delivery time can we promise for 90% of orders?'],
    say: 'A percentile tells me the value a share of data falls under, such as the 90th percentile delivery time, which makes a clear service promise.',
    rel: ['mean-vs-median', 'outlier']
  },
  {
    id: 'outlier', term: 'Outlier',
    def: 'A value far from the rest of the data.',
    deep: 'Outliers are either errors (a price of 999999) or real and important (one huge wholesale order). Investigate before removing. A common flag is anything beyond 1.5 times the interquartile range outside the middle half.',
    mistakes: ['Deleting outliers without checking whether they are real.', 'Reporting a mean that one outlier is driving.'],
    say: 'An outlier is far from the rest. I check whether it is an error or a real event before I exclude or keep it.',
    rel: ['mean-vs-median', 'percentile', 'data-quality']
  },
  {
    id: 'sample-population', term: 'Sample vs population',
    def: 'The population is everyone you care about. A sample is the part you actually measured.',
    deep: 'Most analysis is on a sample: one month of data, survey responders, people who saw a test. Results only generalise if the sample is representative. Bigger samples reduce random noise but do not fix bias.',
    questions: ['Can results from one city be applied to the whole country?'],
    say: 'A sample is the part I measured; the population is who I want to describe. Size reduces noise, but only a fair sample removes bias.',
    rel: ['sampling-bias', 'confidence-interval']
  },
  {
    id: 'sampling-bias', term: 'Sampling and survivorship bias',
    def: 'When the data you have differs systematically from the group you want to understand.',
    deep: 'Survey responders are often the happiest or angriest customers. Survivorship bias looks only at what survived: studying current customers tells you nothing about why others left. Ask who is missing from the data.',
    questions: ['Who is missing from this data, and would they change the answer?'],
    say: 'Bias happens when my data is not representative, like only surveying people who stayed. I always ask who is missing.',
    rel: ['sample-population', 'correlation-causation']
  },
  {
    id: 'ab-test', term: 'A/B test',
    def: 'An experiment that randomly splits people into groups that see different versions, then compares the results.',
    deep: 'Randomisation is what lets you claim cause: the groups differ only in the change. Decide the metric, the minimum effect worth detecting and the sample size before starting, and do not stop early when the result looks good ("peeking").',
    mistakes: ['Stopping the test as soon as it looks significant.', 'Checking many metrics and reporting the one that moved.'],
    questions: ['Did the new checkout page actually increase conversion?'],
    say: 'An A/B test randomly splits users between versions so a difference can be attributed to the change. I fix the metric and sample size up front.',
    rel: ['significance', 'confidence-interval', 'conversion-rate', 'correlation-causation']
  },
  {
    id: 'significance', term: 'Statistical significance',
    def: 'A result is significant when it would be unlikely if there were really no difference.',
    deep: 'The p-value is the chance of seeing a difference at least this big if there were truly no effect. Below 0.05 is the usual bar. Significance is not size: with huge samples a tiny, worthless difference can be significant. Always report the effect size too.',
    mistakes: ['Reading p = 0.04 as "96% sure the change works".', 'Treating "not significant" as "proved no effect".'],
    say: 'Significance means the result is unlikely to be chance alone. I report the size of the effect too, because significant is not the same as important.',
    rel: ['ab-test', 'confidence-interval']
  },
  {
    id: 'confidence-interval', term: 'Confidence interval',
    def: 'A range of plausible values for a number, given the noise in the data.',
    deep: '"Conversion rose 1.2 points, 95% interval 0.4 to 2.0" says more than a p-value: the effect is real and probably between those values. A wide interval means you need more data before deciding.',
    questions: ['How sure are we about this uplift before we roll it out everywhere?'],
    say: 'A confidence interval gives a plausible range for the true value. If it is wide, I say we need more data before deciding.',
    rel: ['significance', 'sample-population', 'variance']
  },
  {
    id: 'correlation-causation', term: 'Correlation vs causation',
    def: 'Two things moving together does not mean one causes the other.',
    deep: 'Ice cream sales and sunburn rise together because of the weather, a confounder. Customers who use the app spend more, but big spenders may simply be more likely to download it. To show cause, run an experiment or use careful methods that control for confounders.',
    questions: ['Did the loyalty programme make people spend more, or did big spenders join it?'],
    say: 'Correlation is moving together; causation is one driving the other. I look for confounders and prefer an experiment before claiming cause.',
    rel: ['ab-test', 'simpsons-paradox', 'attribution']
  },
  {
    id: 'simpsons-paradox', term: 'Simpson\'s paradox',
    def: 'A trend that appears in every group can reverse when the groups are combined.',
    deep: 'Each region\'s on-time rate can improve while the overall rate falls, if more orders shift to the slowest region. Always check whether the mix of groups changed before reading an overall average.',
    questions: ['Did performance really get worse, or did the mix of orders change?'],
    ex: 'Courier A has the better on-time rate in cities and in rural towns, yet Courier B has the better rate overall.',
    say: 'Simpson\'s paradox is when combining groups reverses a trend. I check whether the mix changed before trusting an overall average.',
    rel: ['correlation-causation', 'cohort-analysis']
  },
  {
    id: 'regression', term: 'Regression',
    def: 'A model that estimates how an outcome changes as one or more inputs change.',
    deep: 'Linear regression fits a line: each extra day of delivery delay lowers the review score by about 0.2 points, holding other things equal. It describes relationships in the data you have; it proves cause only with a good design.',
    questions: ['How much does a late delivery hurt the review score?'],
    say: 'Regression estimates how an outcome moves with its inputs, holding the others fixed. It shows relationships, not proof of cause.',
    rel: ['correlation-causation', 'forecast']
  },
  {
    id: 'forecast', term: 'Forecast',
    def: 'An estimate of a future value, such as next month\'s orders, usually based on past patterns.',
    deep: 'Good forecasts combine trend, seasonality and known events (holidays, promotions), and come with a range, not a single number. Check them against what actually happened and track the error.',
    questions: ['How many orders should we plan for next month?', 'How much stock do we need for the holidays?'],
    say: 'A forecast predicts future values from trend, seasonality and known events. I give a range and measure how accurate past forecasts were.',
    rel: ['seasonality', 'moving-average', 'regression']
  },
  {
    id: 'normal-distribution', term: 'Normal distribution',
    def: 'A symmetrical, bell-shaped spread of values where most sit near the average and fewer sit further out.',
    deep: 'Many measurements, like heights or small measurement errors, roughly follow a bell curve. In a normal distribution about 68% of values fall within one standard deviation of the mean and about 95% within two. Many statistical tests assume normality, but plenty of business data is not normal: order values, delivery times and income are usually skewed, so check the shape before you lean on those rules.',
    ex: 'Mean delivery time 5 days, standard deviation 1 day:\nabout 68% arrive in 4 to 6 days\nabout 95% arrive in 3 to 7 days',
    mistakes: ['Assuming business data is normal without looking at a histogram.', 'Using the 95% rule on heavily skewed data.'],
    questions: ['Is a 9-day delivery unusual, or normal variation?', 'What range should we promise customers?'],
    say: 'Before I use rules that assume a normal distribution, I plot the data, because business numbers like order values are often skewed.',
    rel: ['distribution', 'variance', 'skewness']
  },
  {
    id: 'skewness', term: 'Skewness',
    def: 'How lopsided a distribution is: a long tail to the right is right-skewed, a long tail to the left is left-skewed.',
    deep: 'Right skew is very common in business: most orders are small, a few are huge; most deliveries are quick, a few take weeks. The long tail pulls the mean towards it, so in right-skewed data the mean is above the median. That is why the median, or percentiles, often describe "typical" better than the average does.',
    ex: 'Order values: most between R100 and R400, a few over R5,000.\nMedian R250, mean R610: the tail pulls the mean up.',
    mistakes: ['Reporting the average order value without saying the data is skewed.', 'Calling large values errors when they are just the tail.'],
    questions: ['What does a typical customer spend?', 'Is the average being pulled up by a few big orders?'],
    say: 'Most business data is right-skewed, so I report the median alongside the mean, and look at the tail separately.',
    rel: ['mean-vs-median', 'distribution', 'outlier']
  },
  {
    id: 'z-score', term: 'Z-score',
    def: 'How many standard deviations a value sits above or below the mean.',
    deep: 'A z-score puts different measures on the same scale. A z-score of 0 is exactly average; +2 is two standard deviations above. It is a quick way to flag unusual values, for example anything beyond ±3, and to compare things measured in different units. It works best on roughly normal data; on skewed data, percentiles are safer.',
    ex: 'Daily orders: mean 500, standard deviation 40.\nToday: 620 orders → z = (620 - 500) / 40 = 3.0, an unusual day.',
    mistakes: ['Using z-scores to find outliers in heavily skewed data.', 'Forgetting that the mean and standard deviation include the outliers themselves.'],
    questions: ['Was today\'s spike in orders unusual?', 'Which stores perform far outside the normal range?'],
    say: 'A z-score tells me how many standard deviations a value is from the mean, which is a quick way to flag unusual days.',
    rel: ['variance', 'outlier', 'normal-distribution']
  },
  {
    id: 'weighted-average', term: 'Weighted average',
    def: 'An average where some values count more than others, usually in proportion to their size.',
    deep: 'Averaging averages is one of the most common mistakes in reporting. If one store has 10 orders at 2 days and another has 1,000 orders at 6 days, the plain average of the two store averages is 4 days, but the real average delivery time is almost 6. Weight each value by how many items it represents, or better, go back to the raw rows and average those.',
    ex: 'Store A: 10 orders, average 2 days\nStore B: 1,000 orders, average 6 days\nAverage of averages: 4.0 days (wrong)\nWeighted: (10×2 + 1000×6) / 1010 = 5.96 days',
    mistakes: ['Averaging percentages or averages from groups of different sizes.', 'Weighting by the wrong thing, for example by customers when the question is about orders.'],
    questions: ['What is our true average delivery time across all stores?', 'What is the overall conversion rate across campaigns of different sizes?'],
    say: 'I avoid averaging averages. I weight by group size, or recalculate from the underlying rows.',
    rel: ['mean-vs-median', 'simpsons-paradox', 'aggregate-function']
  },
  {
    id: 'p-value', term: 'P-value',
    def: 'The chance of seeing a result at least this extreme if there were really no difference.',
    deep: 'A small p-value, often below 0.05, means the result would be surprising if nothing were going on, so it counts as evidence of a real effect. It does not tell you the size of the effect, or the chance your idea is true. A tiny, unimportant difference can have a small p-value with enough data, and an important one can miss with too little. Report the effect size and a confidence interval alongside it.',
    ex: 'A/B test: new checkout converts at 5.4% vs 5.0%.\np = 0.03 → unlikely to be chance alone.\nEffect: +0.4 percentage points (95% CI +0.04 to +0.76).',
    mistakes: ['Reading p = 0.03 as "a 97% chance the new version is better".', 'Checking the p-value every day and stopping as soon as it dips below 0.05.'],
    questions: ['Is this test result real or just noise?', 'Should we roll out the new checkout?'],
    say: 'A p-value tells me how surprising the result would be if there were no real difference. I report it with the effect size, not on its own.',
    rel: ['significance', 'ab-test', 'confidence-interval']
  },
  {
    id: 'type-errors', term: 'Type I and Type II errors',
    def: 'A Type I error is a false alarm: finding an effect that is not real. A Type II error is a miss: failing to find one that is.',
    deep: 'Every test balances the two. A strict threshold (say p below 0.01) means fewer false alarms but more misses. A loose one means the opposite. Which matters more depends on the cost: launching a change that does nothing (Type I) may be cheap, while missing a fraud pattern (Type II) may be expensive. Larger samples reduce both.',
    ex: 'Type I: you declare the new checkout better, but it is not.\nType II: the new checkout is better, but the test was too small to show it.',
    mistakes: ['Treating "not significant" as proof that there is no effect.', 'Running many tests and celebrating the one that happens to cross the line.'],
    questions: ['How confident are we that this win is real?', 'Was our test big enough to detect a real improvement?'],
    say: 'Type I is a false alarm, Type II is a miss. I choose thresholds based on which mistake costs the business more.',
    rel: ['significance', 'sample-size-power', 'ab-test']
  },
  {
    id: 'sample-size-power', term: 'Sample size and statistical power',
    def: 'Power is the chance a test detects a real effect; it rises with a larger sample and a bigger effect.',
    deep: 'Before running a test, decide the smallest effect worth knowing about, then work out how many users you need to reliably detect it, commonly with 80% power. Small effects need large samples: spotting a 0.2 percentage-point lift in conversion can need hundreds of thousands of visitors. Running an underpowered test wastes time and usually ends with "no clear result".',
    ex: 'Baseline conversion 5%. Smallest lift worth detecting: 5% → 5.5%.\nAt 80% power and 5% significance that needs roughly 31,000 visitors per group.',
    mistakes: ['Starting a test without working out how long it needs to run.', 'Stopping early because the result looks good.'],
    questions: ['How long do we need to run this test?', 'Is our site busy enough to test such a small change?'],
    say: 'I work out the sample size before a test starts, based on the smallest effect that matters, so the test has enough power to find it.',
    rel: ['ab-test', 'type-errors', 'sample-population']
  },
  {
    id: 'confounding-variable', term: 'Confounding variable',
    def: 'A hidden factor that affects both things you are comparing, making them look linked when they may not be.',
    deep: 'Customers who use the app spend more than those who use the website. Is the app making them spend? Perhaps not: loyal customers are more likely to download the app and also more likely to spend. Loyalty is the confounder. Randomised tests remove confounders; otherwise compare like with like, for example within the same customer segment.',
    ex: 'Ice cream sales and drownings rise together.\nThe confounder is hot weather, which drives both.',
    mistakes: ['Claiming a feature causes higher spend because users of it spend more.', 'Comparing groups that differ in many ways at once.'],
    questions: ['Did the loyalty programme increase spend, or did big spenders just join it?', 'Why do these two metrics move together?'],
    say: 'When two things move together, I look for a confounder that drives both before I claim one causes the other.',
    rel: ['correlation-causation', 'simpsons-paradox', 'ab-test']
  },
  {
    id: 'rates-ratios', term: 'Rates and ratios',
    def: 'Comparing a count with a base, such as late orders per 100 orders, so groups of different sizes can be compared fairly.',
    deep: 'Gauteng will always have more late deliveries than the Northern Cape, simply because it has more deliveries. Raw counts mostly measure size. Dividing by the right base, such as orders, customers or days, turns counts into rates you can compare. Always say what the base is, and show the count too, because a 50% rate on 4 orders means little.',
    ex: 'Gauteng: 1,200 late of 18,000 = 6.7%\nEastern Cape: 900 late of 3,000 = 30%\nFewer late orders, but a far worse rate.',
    mistakes: ['Ranking regions by raw counts that mostly reflect their size.', 'Showing a rate without the number of cases behind it.'],
    questions: ['Which province has the worst delivery performance?', 'Is churn worse in this segment, or is the segment just bigger?'],
    say: 'I compare groups using rates with a clear base, like late orders per 100, and show the counts alongside so small groups are not over-read.',
    rel: ['conversion-rate', 'kpi', 'weighted-average']
  }
]);

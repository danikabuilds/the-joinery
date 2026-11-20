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
  }
]);

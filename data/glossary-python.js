// Python and pandas terms. See data/glossary.js for what each field means.
window.addGlossary('Python', [
  {
    id: 'pandas', term: 'pandas',
    def: 'The Python library most data teams use to load, clean, reshape and summarise tables.',
    deep: 'It gives Python a table type (the DataFrame) and hundreds of tools for it: reading CSV and Excel files, fixing types, filtering, grouping, joining and writing results back out. It works in memory, so it suits files from a few rows up to a few million. For bigger data, teams move the heavy lifting into a warehouse or a tool like DuckDB or Spark, and use pandas for the last steps.',
    ex: 'import pandas as pd\norders = pd.read_csv("orders.csv")\norders.groupby("province")["order_total"].sum()', exCode: true,
    mistakes: ['Loading a file far bigger than the computer\'s memory.', 'Looping over rows one at a time when a whole-column operation would do.'],
    questions: ['How do I clean and summarise this export without doing it by hand in Excel?'],
    say: 'I use it for most cleaning and analysis in Python: load, fix types, filter, group and join, then hand the result to a chart or a report.',
    rel: ['dataframe', 'library-import', 'vectorised-operations']
  },
  {
    id: 'dataframe', term: 'DataFrame and Series',
    def: 'The two main building blocks in pandas: a whole table, and a single column of it.',
    deep: 'A DataFrame has rows, named columns and an index (the row labels). Picking one column, as in orders["province"], gives a Series: a list of values that shares the same index. Most tools work on both, so what you learn on a column usually works on a table too.',
    ex: 'orders            # DataFrame: the whole table\norders["city"]    # Series: one column\norders[["city", "province"]]   # DataFrame: two columns (note the double brackets)', exCode: true,
    mistakes: ['Using single brackets with a list of columns, which raises an error. Two columns need double brackets.', 'Expecting a Series to have column names.'],
    questions: ['Why does picking one column behave differently from picking two?'],
    say: 'A pandas table is made of columns that share one index. One column on its own is a Series, and two or more together are still a table.',
    rel: ['pandas', 'pandas-index', 'dtype']
  },
  {
    id: 'pandas-index', term: 'Index (pandas)',
    def: 'The row labels of a pandas table, shown down the left-hand side.',
    deep: 'By default the labels are 0, 1, 2 and so on, but after a groupby the group names become the labels. pandas lines rows up by these labels when it combines columns, which is useful but can surprise you. reset_index() turns the labels back into an ordinary column, which you usually want before merging or saving.',
    ex: 'by_province = orders.groupby("province")["order_total"].sum()\n# province is now the row labels, not a column\nby_province = by_province.reset_index()', exCode: true,
    mistakes: ['Trying to merge on a column that has become the row labels after a groupby.', 'Saving a file with to_csv and getting an extra unnamed column of numbers. Add index=False.'],
    questions: ['Why did my province column vanish after grouping?'],
    say: 'After a groupby, the groups become the row labels, so I call reset_index before I merge or save.',
    rel: ['dataframe', 'pandas-groupby', 'pandas-merge']
  },
  {
    id: 'dtype', term: 'dtype',
    def: 'The type pandas has stored a column as: whole numbers, decimals, text, dates or True and False.',
    deep: 'The type decides what you can do. Text cannot be added up, and text dates cannot be subtracted. CSV files hold only text, so pandas guesses each column\'s type when reading, and the guess is often wrong for prices with an R in front or dates in mixed formats. Check with dtypes or info() straight after reading, then fix with astype, pd.to_numeric or pd.to_datetime.',
    ex: 'orders.dtypes\n# order_total    object   <- text, so it cannot be summed yet\norders["order_total"] = orders["order_total"].str.replace("R", "").astype(float)', exCode: true,
    mistakes: ['Summing a column that is still text, which joins the values together instead of adding them.', 'Letting pandas guess mixed date formats, so some days and months get swapped.'],
    questions: ['Why does the total come out as a long string of numbers?'],
    say: 'Straight after reading a file I check the column types, because a number or a date stored as text breaks every calculation after it.',
    rel: ['data-type', 'nan', 'dataframe']
  },
  {
    id: 'nan', term: 'NaN',
    def: 'How pandas marks a missing value. It stands for "not a number" and plays the part NULL plays in SQL.',
    deep: 'Most pandas calculations skip missing values: sum, mean and count ignore them. That is usually what you want, but it means a count of a column can be smaller than the number of rows. isna() finds them, fillna() replaces them and dropna() removes rows that have them. Decide column by column; a missing total and a missing delivery date mean different things.',
    ex: 'orders.isna().sum()                 # missing values per column\norders["city"] = orders["city"].fillna("Unknown")', exCode: true,
    mistakes: ['Dropping every row with any missing value and losing good data.', 'Filling missing amounts with 0, which drags averages down.', 'Comparing with == to find missing values. Use isna().'],
    questions: ['Why does the count say 343 when the file has 355 rows?'],
    say: 'I count the missing values per column first, then decide case by case whether to fill, flag or leave them, rather than dropping rows on sight.',
    rel: ['null', 'coalesce', 'dtype']
  },
  {
    id: 'boolean-mask', term: 'Boolean mask',
    def: 'A column of True and False values, one per row, used to keep only the rows you want.',
    deep: 'A comparison on a column, such as orders["province"] == "Gauteng", gives True or False for every row. Put that inside square brackets and only the True rows stay. Combine conditions with & (and), | (or) and ~ (not), with each condition in its own brackets. Because True counts as 1, the sum of a mask is how many rows match, and the mean is the share that match.',
    ex: 'late = orders["days_to_deliver"] > 5\nlate.sum()     # how many are late\nlate.mean()    # the share that is late\norders[late & (orders["province"] == "Gauteng")]', exCode: true,
    mistakes: ['Writing "and" or "or" instead of & and |.', 'Leaving out the brackets around each condition when combining them.'],
    questions: ['What share of orders were delivered late?'],
    say: 'I write each filter rule as a True or False column, so I can count how many rows break it before I remove them.',
    rel: ['vectorised-operations', 'case', 'dataframe']
  },
  {
    id: 'vectorised-operations', term: 'Vectorised operations',
    def: 'Working on a whole column at once, instead of looping over the rows one by one.',
    deep: 'orders["total"] * 1.15 multiplies every value in one go. pandas does the work in fast, compiled code, so it is often hundreds of times quicker than a Python loop, and much shorter to read. The .str and .dt tools do the same for text and dates. Reach for a loop or apply only when there is no column-wide way to do it.',
    ex: '# slow and long\nfor i in range(len(orders)):\n    orders.loc[i, "with_vat"] = orders.loc[i, "order_total"] * 1.15\n# fast and short\norders["with_vat"] = orders["order_total"] * 1.15', exCode: true,
    mistakes: ['Writing a for loop over rows for simple maths.', 'Using apply for something a built-in column tool already does.'],
    questions: ['Why does my notebook take minutes to add one column?'],
    say: 'I work on whole columns rather than looping over rows. It is faster and easier to read.',
    rel: ['apply', 'boolean-mask', 'pandas']
  },
  {
    id: 'method-chaining', term: 'Method chaining',
    def: 'Writing several pandas steps one after another in a single expression, one step per line.',
    deep: 'Each step hands its result to the next, so the code reads top to bottom like a recipe and you do not need a name for every in-between table. Wrap the whole thing in round brackets so you can put each step on its own line. To debug, comment out the later lines and look at what an earlier step gives.',
    ex: 'by_province = (orders\n               .groupby("province")\n               .agg(revenue=("order_total", "sum"))\n               .sort_values("revenue", ascending=False))', exCode: true,
    mistakes: ['Chaining twenty steps, so nobody can tell where it went wrong.', 'Forgetting the outer brackets, which makes Python stop at the end of the first line.'],
    say: 'I chain short steps inside brackets, one per line, so the logic reads in order, and I break it up when it gets long.',
    rel: ['pandas-groupby', 'dataframe']
  },
  {
    id: 'pandas-groupby', term: 'groupby (pandas)',
    def: 'Splitting rows into groups, working out numbers for each group, and putting the answers back together as a table.',
    deep: 'It is the pandas version of GROUP BY in SQL. With agg you can name each result: agg(orders=("order_id", "count"), revenue=("order_total", "sum")). The group names become the row labels, so call reset_index() if you need them as a column. Missing values in the grouping column are left out by default; add dropna=False to keep them as their own group.',
    ex: 'orders.groupby("province").agg(\n    orders=("order_id", "count"),\n    revenue=("order_total", "sum"),\n    average_order=("order_total", "mean"))', exCode: true,
    mistakes: ['Losing rows whose group is missing without noticing.', 'Comparing averages across groups without checking how many rows each group has.'],
    questions: ['Which province brings in the most revenue, and how many orders is that from?'],
    say: 'I split the rows into groups, calculate named results for each, and always check the group sizes before comparing averages.',
    rel: ['group-by', 'aggregate-function', 'pandas-index']
  },
  {
    id: 'pandas-merge', term: 'merge (pandas)',
    def: 'Joining two pandas tables on a shared column, the pandas version of a SQL join.',
    deep: 'how= picks the join type: "left" keeps every row of the left table, "inner" keeps only matches. indicator=True adds a _merge column that says whether each row matched, which makes missing matches easy to count. validate="one_to_one" or "many_to_one" makes pandas stop with an error if the keys are not as unique as you expect, which is how you catch fan-out before it inflates a total.',
    ex: 'orders.merge(customers, on="customer_id", how="left", indicator=True, validate="many_to_one")', exCode: true,
    mistakes: ['Merging onto a table with several rows per key and summing a column that got copied.', 'Using the default inner join and silently losing unmatched rows.'],
    questions: ['Why did revenue nearly double after I added the items table?'],
    say: 'Before I merge I check whether the key is unique on each side, I use validate so pandas stops me if it is not, and I compare row counts before and after.',
    rel: ['left-join', 'inner-join', 'fan-out']
  },
  {
    id: 'concat', term: 'concat',
    def: 'Stacking tables that have the same columns on top of each other, such as one file per day.',
    deep: 'pd.concat takes a list of tables and returns one. Columns are matched by name; a column missing from some tables is filled with missing values, so a new column in one file does not cause an error, but it does leave gaps worth checking. ignore_index=True numbers the rows afresh. It is the pandas version of UNION ALL.',
    ex: 'week = pd.concat([monday, tuesday, wednesday], ignore_index=True)\nlen(week) == len(monday) + len(tuesday) + len(wednesday)', exCode: true,
    mistakes: ['Not checking that the row count equals the sum of the files.', 'Missing that one file had a renamed or extra column.'],
    questions: ['How do I combine a week of daily exports into one table?'],
    say: 'I stack the files with a column saying where each row came from, then check the row count and look for columns that only some files have.',
    rel: ['union', 'schema-drift', 'python-function']
  },
  {
    id: 'apply', term: 'apply',
    def: 'Running your own Python function on every value, row or group of a pandas table.',
    deep: 'It is the escape hatch for logic that no built-in tool covers, such as a complicated rule that looks at several columns. It runs ordinary Python one item at a time, so it is far slower than whole-column tools. Check first whether .str, .dt, np.where or a mapping does the job.',
    ex: 'def size_band(total):\n    if total < 500:\n        return "small"\n    return "large" if total > 2000 else "medium"\n\norders["band"] = orders["order_total"].apply(size_band)', exCode: true,
    mistakes: ['Using it for simple maths or text tidying that has a faster built-in tool.', 'Using it on millions of rows and waiting minutes.'],
    questions: ['How do I label each order with a rule that no built-in tool covers?'],
    say: 'I use it for custom logic only when there is no whole-column way to do it, because it is much slower.',
    rel: ['vectorised-operations', 'python-function', 'case']
  },
  {
    id: 'python-function', term: 'Function (Python)',
    def: 'A named, reusable block of code that takes inputs and hands back a result.',
    deep: 'def starts it, the inputs go in brackets, and return hands back the answer. Write one when you would otherwise copy and paste the same lines. A short description in triple quotes under the def line says what it does. Small functions that do one thing are easier to test and to reuse in a script.',
    ex: 'def load_day(day):\n    """Read one day\'s export."""\n    df = pd.read_csv(f"orders_{day}.csv")\n    df["source_file"] = f"orders_{day}.csv"\n    return df', exCode: true,
    mistakes: ['Forgetting return, so the result is None.', 'Writing one huge function that does everything.'],
    questions: ['How do I stop copying the same ten lines for every file?'],
    say: 'When I need the same steps more than twice, I put them in a small function with a clear name, so I can reuse and test it.',
    rel: ['f-string', 'notebook-vs-script', 'apply']
  },
  {
    id: 'f-string', term: 'f-string',
    def: 'Text with an f in front of the quotes, where anything in curly brackets is replaced by its value.',
    deep: 'It is the easiest way to build file names, messages and labels. You can format numbers inside the brackets: {total:,.2f} adds thousands separators and two decimals. Use it for messages and file paths, but never to paste values into SQL queries that run against a real database; use the database\'s parameters instead.',
    ex: 'day = "2025-11-24"\nf"orders_{day}.csv"          # orders_2025-11-24.csv\ntotal = 395077.83\nf"Revenue: R{total:,.2f}"     # Revenue: R395,077.83', exCode: true,
    mistakes: ['Forgetting the f, so the curly brackets appear as they are.', 'Building SQL from user input with it.'],
    questions: ['How do I build a file name for each day in a loop?'],
    say: 'I use them to build file names and clear log messages, with number formatting so totals are readable.',
    rel: ['python-function', 'library-import']
  },
  {
    id: 'library-import', term: 'Library and import',
    def: 'A library is ready-made code someone else wrote; import makes it available in your notebook or script.',
    deep: 'import pandas as pd loads pandas and gives it the short name pd, which everyone uses by habit. Libraries are installed once (with pip, or already in Colab) and imported at the top of every notebook or script that uses them. Common ones for data work: pandas for tables, numpy for maths, matplotlib for charts, duckdb for SQL.',
    ex: 'import pandas as pd\nimport matplotlib.pyplot as plt\nimport duckdb', exCode: true,
    mistakes: ['Importing in the middle of a notebook, so the code breaks when run from the top.', 'Confusing "not installed" (needs pip) with "not imported" (needs import).'],
    questions: ['Why does Python say No module named duckdb?'],
    say: 'I import everything at the top, using the usual short names, so anyone can see what the code depends on.',
    rel: ['virtual-environment', 'pandas']
  },
  {
    id: 'virtual-environment', term: 'Virtual environment and pip',
    def: 'pip installs Python libraries; a virtual environment keeps each project\'s libraries separate from the others.',
    deep: 'Different projects need different versions of the same library. A virtual environment (made with python -m venv .venv) is a private folder of libraries for one project. A requirements.txt file lists them, so anyone can rebuild the same set with pip install -r requirements.txt. Colab manages this for you, which is one reason it is a good place to start.',
    ex: 'python -m venv .venv\n.venv\\Scripts\\activate          # Windows; on Mac: source .venv/bin/activate\npip install pandas duckdb\npip freeze > requirements.txt', exCode: true,
    mistakes: ['Installing everything into one global Python until versions clash.', 'Not writing down the versions, so the code breaks on someone else\'s computer.'],
    questions: ['Why does my script work on my laptop but not on the server?'],
    say: 'Each project gets its own environment and a requirements file, so anyone can rebuild exactly what I ran.',
    rel: ['library-import', 'notebook-vs-script']
  },
  {
    id: 'notebook-vs-script', term: 'Notebook vs script',
    def: 'A notebook is a page of cells you run one at a time; a script is one .py file that runs top to bottom.',
    deep: 'Notebooks (Jupyter, Colab) are best for exploring: you see each result straight away, with charts and tables in between. But cells can be run out of order, which hides mistakes. Scripts are best for anything that runs again and again or on a schedule, because they always run in the same order and can be tested. A common path is to explore in a notebook, then move the working steps into functions in a script.',
    ex: '# combine_week.py\ndef main():\n    ...\n\nif __name__ == "__main__":\n    main()\n\n# run it with: python combine_week.py', exCode: true,
    mistakes: ['Running a daily job by hand from a notebook.', 'A notebook that only works if the cells are run in a certain order.'],
    questions: ['How do we get this analysis to refresh every morning without someone running it?'],
    say: 'I explore in a notebook, then move what works into a script with functions, so it runs the same way every time and can be scheduled.',
    rel: ['python-function', 'orchestration', 'idempotency']
  }
]);

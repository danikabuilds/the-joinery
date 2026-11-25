# SQL inside Python with DuckDB

*Python practice. About 20 minutes, nothing to install and nothing to download.*

## Before you start

DuckDB is a small, fast database that runs inside Python. Its best trick: it can run SQL directly on a pandas table, just by using the table's name. So you can use SQL where SQL is clearer and pandas where pandas is clearer, in the same notebook.

**Run it in Google Colab** (free, needs a Google account): [open the ready-made notebook](https://colab.research.google.com/github/danikabuilds/the-joinery/blob/main/projects/python-duckdb/python-duckdb.ipynb), then run each cell with Shift + Enter. Or open a blank notebook at [colab.research.google.com](https://colab.research.google.com/) and paste each step in as you go.

The code reads the practice files straight from The Joinery, so there is nothing to download or upload.

> **Tip:** Colab usually has DuckDB already. If you see `No module named 'duckdb'`, run `!pip install duckdb` in a cell, then try again.

## 1. Your first query

*About 3 minutes*

`duckdb.sql("...")` runs a query. In the query, `orders` is simply the pandas table called `orders`. `.df()` hands the answer back as a pandas table.

```python Python
import duckdb
import pandas as pd

BASE = "https://thejoinery.dev/projects/python-data/"
orders = pd.read_csv(BASE + "orders.csv", parse_dates=["order_date", "delivered_date"])
items = pd.read_csv(BASE + "order_items.csv")
print(duckdb.sql("SELECT COUNT(*) AS orders FROM orders").df())
```

```text Output
   orders
0     355
```

## 2. GROUP BY in SQL

*About 4 minutes*

Triple quotes (`"""`) let a query run over several lines, which keeps it readable.

```python Python
by_province = duckdb.sql("""
    SELECT province,
           COUNT(*) AS orders,
           ROUND(SUM(order_total), 2) AS revenue
    FROM orders
    GROUP BY province
    ORDER BY revenue DESC
""").df()
print(by_province)
print(type(by_province))
```

> **You should see:** the same numbers as the groupby in [Explore and summarise](https://thejoinery.dev/#/projects/python-explore), and the type `DataFrame`.

```text Output
        province  orders    revenue
0        Gauteng     119  136372.98
1  KwaZulu-Natal      68   82209.51
2   Western Cape      66   79386.47
3     Free State      17   22532.41
4   Eastern Cape      26   21385.30
5        Limpopo      18   18253.30
6     North West      13   13842.28
7     Mpumalanga      17   11591.71
8  Northern Cape      11    9503.87
<class 'pandas.core.frame.DataFrame'>
```

Same answer, two languages. Use whichever your team reads more easily.

## 3. Join without fan-out, using a CTE

*About 5 minutes*

A [CTE](https://thejoinery.dev/#/glossary/term/cte) (the `WITH ... AS` part) is a named step inside a query. Here it counts the items per order first, so the join matches one row to one row and nothing is counted twice. It is the SQL version of the fix in [Merge tables](https://thejoinery.dev/#/projects/python-merge).

```python Python
per_order = duckdb.sql("""
    WITH item_counts AS (
        SELECT order_id, COUNT(*) AS items
        FROM items
        GROUP BY order_id
    )
    SELECT o.order_id, o.order_total, i.items
    FROM orders AS o
    LEFT JOIN item_counts AS i ON o.order_id = i.order_id
    ORDER BY i.items DESC, o.order_total DESC
    LIMIT 5
""").df()
print(per_order)
```

```text Output
  order_id  order_total  items
0  O040047      6405.91      4
1  O015000      6266.01      4
2  O013588      6009.01      4
3  O027610      4832.36      4
4  O019137      4644.16      4
```

## 4. The top city in each province

*About 5 minutes*

A [window function](https://thejoinery.dev/#/glossary/term/window-function) works across a group of rows without squashing them into one. `RANK() OVER (PARTITION BY province ...)` ranks the cities within each province. `QUALIFY` then keeps only rank 1. It works in DuckDB, Snowflake and BigQuery, but not in every database.

```python Python
ranked = duckdb.sql("""
    SELECT province,
           city,
           COUNT(*) AS orders,
           RANK() OVER (PARTITION BY province ORDER BY COUNT(*) DESC) AS rank_in_province
    FROM orders
    GROUP BY province, city
    QUALIFY rank_in_province = 1
    ORDER BY orders DESC
""").df()
print(ranked)
```

```text Output
        province          city  orders  rank_in_province
0   Western Cape     Cape Town      39                 1
1  KwaZulu-Natal        Durban      38                 1
2        Gauteng      Pretoria      34                 1
3     Free State  Bloemfontein      15                 1
4        Limpopo     Polokwane      13                 1
5   Eastern Cape   East London      11                 1
6     Mpumalanga      Mbombela      10                 1
7     North West      Mahikeng       7                 1
8  Northern Cape      Upington       6                 1
```

This "top one per group" question comes up in interviews a lot. See [top N per group](https://thejoinery.dev/#/glossary/term/top-n-per-group).

## 5. SQL first, then pandas

*About 3 minutes*

Use SQL to get monthly revenue, then pandas to add a running total with `cumsum()` (cumulative sum).

```python Python
monthly = duckdb.sql("""
    SELECT DATE_TRUNC('month', order_date) AS month,
           ROUND(SUM(order_total), 2) AS revenue
    FROM orders
    GROUP BY month
    ORDER BY month
""").df()
monthly["running_total"] = monthly["revenue"].cumsum().round(2)
print(monthly.tail(4))
```

> **You should see:** the running total ending at R395 077.83, the same total as every other guide.

```text Output
        month   revenue  running_total
19 2025-08-01  19591.33      331299.68
20 2025-09-01  17472.89      348772.57
21 2025-10-01  26475.75      375248.32
22 2025-11-01  19829.51      395077.83
```

A [running total](https://thejoinery.dev/#/glossary/term/running-total) in SQL needs a window function. In pandas it is one word, so this split plays to each one's strengths.

## What you just did

| You did | With |
|---|---|
| Ran SQL on a pandas table | `duckdb.sql(...)` |
| Got the answer back as pandas | `.df()` |
| Counted first, then joined | A CTE |
| Ranked within groups | `RANK() OVER (PARTITION BY ...)` and `QUALIFY` |
| Mixed the two | SQL for the summary, pandas for the next step |

**Say it in an interview:** "I'm comfortable in both. I'll often use DuckDB to run SQL on dataframes, because some steps are clearer in SQL and others in pandas, and the results match either way."

**Next:** [From notebook to script: many files](https://thejoinery.dev/#/projects/python-files).

---

Part of [The Joinery](https://thejoinery.dev/), free data practice in your browser.

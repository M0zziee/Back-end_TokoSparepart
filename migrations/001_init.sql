CREATE TABLE categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  category_id bigint REFERENCES categories (id) ON DELETE SET NULL,
  price numeric(12, 2) NOT NULL CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_category_id_idx ON products (category_id);

-- qty disimpan bertanda: in > 0, out < 0, adjustment boleh +/-
-- stok saat ini = SUM(qty) per produk
CREATE TABLE stock_movements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id bigint NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  qty integer NOT NULL CHECK (qty <> 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (type = 'in' AND qty > 0)
    OR (type = 'out' AND qty < 0)
    OR type = 'adjustment'
  )
);

CREATE INDEX stock_movements_product_id_idx ON stock_movements (product_id, created_at DESC);

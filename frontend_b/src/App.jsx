import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

// Configuración: cambia REACT_APP_API_URL en .env o usa http://localhost:3000
const API = 'http://localhost:3001';

// --------------------------
// Helper: cliente axios
// --------------------------
const api = axios.create({ baseURL: API, timeout: 10000 });

// --------------------------
// UI Components simples
// --------------------------
function Header() {
  return (
    <header className="bg-white dark:bg-gray-900 shadow p-4 flex items-center justify-between">
      <h1 className="text-xl text-white font-bold">Farmacia B</h1>
      <nav className="space-x-3">
        <Link className="px-3 py-1 text-white rounded hover:bg-gray-100" to="/">Productos</Link>
        <Link className="px-3 py-1 text-white rounded hover:bg-gray-100" to="/ventas">Ventas</Link>
        <Link className="px-3 py-1 text-white rounded hover:bg-gray-100" to="/clientes">Clientes</Link>
        <Link className="px-3 py-1 text-white rounded hover:bg-gray-100" to="/proveedores">Proveedores</Link>
        <Link className="px-3 py-1 text-white rounded hover:bg-gray-100" to="/reportes">Reportes</Link>
        <Link className="px-3 py-1 text-white rounded hover:bg-gray-100" to="/global">Vista Global</Link>
        <Link className="px-3 py-1 text-white rounded hover:bg-gray-100" to="/sync">Sync</Link>
      </nav>
    </header>
  );
}

function Container({ children }) {
  return <main className="p-6 bg-gray-50 min-h-screen">{children}</main>;
}

// --------------------------
// Productos: Lista, Crear, Editar
// --------------------------
function ProductosList() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  async function fetchProductos() {
    setLoading(true);
    try {
      const res = await api.get('/api/productos');
      setProductos(res.data.data || []);
    } catch (err) {
      console.error(err);
      alert('Error cargando productos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProductos(); }, []);

  async function onSearch(e) {
    e.preventDefault();
    if (!query) return fetchProductos();
    try {
      const res = await api.get('/api/productos/search', { params: { nombre: query } });
      setProductos(res.data.data || []);
    } catch (err) {
      console.error(err);
      alert('Error en búsqueda');
    }
  }

  return (
    <Container>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Productos</h2>
        <div className="space-x-2">
          <button onClick={() => navigate('/productos/nuevo')} className="px-4 py-2 bg-indigo-600 text-white rounded">Nuevo Producto</button>
          <button onClick={fetchProductos} className="px-3 py-2 border rounded">Refrescar</button>
        </div>
      </div>

      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre" className="flex-1 p-2 border rounded" />
        <button className="px-4 py-2 bg-gray-200 rounded">Buscar</button>
      </form>

      {loading ? (
        <div>Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productos.map(p => (
            <div key={p._id} className="bg-white p-4 rounded shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{p.nombre}</h3>
                  <p className="text-sm text-gray-600">ID: {p._id}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${p.precio_venta}</p>
                  <p className="text-sm">Stock: {p.stock_actual ?? 0}</p>
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-700">{p.descripcion}</p>

              <div className="mt-4 flex justify-between">
                <Link to={`/productos/${encodeURIComponent(p._id)}`} className="text-indigo-600">Ver / Editar</Link>
                <Link to={`/productos/${encodeURIComponent(p._id)}/stock`} className="text-gray-600">Actualizar stock</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}

function ProductoForm({ isEdit = false }) {
  const { id } = useParams();
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio_venta: 0, stock_actual: 0, stock_minimo: 0 });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      (async () => {
        setLoading(true);
        try {
          const res = await api.get(`/api/productos/${encodeURIComponent(id)}`);
          setForm(res.data.data);
        } catch (err) {
          console.error(err);
          alert('No se encontró el producto');
          navigate('/');
        } finally { setLoading(false); }
      })();
    }
  }, [id, isEdit, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/api/productos/${encodeURIComponent(id)}`, form);
        alert('Producto actualizado');
      } else {
        await api.post('/api/productos', form);
        alert('Producto creado');
      }
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Error guardando producto');
    }
  }

  return (
    <Container>
      <h2 className="text-2xl mb-4">{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</h2>
      {loading ? <div>Cargando...</div> : (
        <form onSubmit={onSubmit} className="space-y-3 max-w-xl">
          <div>
            <label className="block text-sm">Nombre</label>
            <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm">Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} className="w-full p-2 border rounded" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm">Precio venta</label>
              <input type="number" step="0.01" value={form.precio_venta} onChange={e => setForm({...form, precio_venta: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm">Stock actual</label>
              <input type="number" value={form.stock_actual} onChange={e => setForm({...form, stock_actual: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm">Stock mínimo</label>
              <input type="number" value={form.stock_minimo} onChange={e => setForm({...form, stock_minimo: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded" />
            </div>
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded">Guardar</button>
            <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border rounded">Cancelar</button>
          </div>
        </form>
      )}
    </Container>
  );
}

function ProductoDetalle() {
  const { id } = useParams();
  const [producto, setProducto] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/productos/${encodeURIComponent(id)}`);
        setProducto(res.data.data);
      } catch (err) {
        console.error(err);
        alert('Producto no encontrado en esta sucursal. Intentando búsqueda global...');
        try {
          const r2 = await api.get(`/api/global/producto/${encodeURIComponent(id)}`);
          if (r2.data && r2.data.data) {
            alert(`Encontrado en sucursal ${r2.data.data.sucursal}`);
            setProducto(r2.data.data.producto);
          }
        } catch (err2) {
          alert('Producto no encontrado en la red');
          navigate('/');
        }
      }
    })();
  }, [id, navigate]);

  async function onDelete(hard = false) {
    if (!window.confirm('¿Confirmas eliminar este producto?')) return;
    try {
      await api.delete(`/api/productos/${encodeURIComponent(id)}`, { params: { hard } });
      alert('Producto eliminado');
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Error eliminando producto');
    }
  }

  return (
    <Container>
      {!producto ? <div>Cargando...</div> : (
        <div className="bg-white p-6 rounded shadow max-w-2xl">
          <h2 className="text-2xl font-semibold">{producto.nombre}</h2>
          <p className="text-sm text-gray-600">ID: {producto._id}</p>
          <p className="mt-3">{producto.descripcion}</p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Precio</p>
              <p className="font-medium">${producto.precio_venta}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock actual</p>
              <p className="font-medium">{producto.stock_actual ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock mínimo</p>
              <p className="font-medium">{producto.stock_minimo ?? '-'}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Link to={`/productos/${encodeURIComponent(producto._id)}/editar`} className="px-3 py-2 bg-indigo-600 text-white rounded">Editar</Link>
            <button onClick={() => onDelete(false)} className="px-3 py-2 border rounded">Eliminar (soft)</button>
            <button onClick={() => onDelete(true)} className="px-3 py-2 border rounded">Eliminar (permanente)</button>
          </div>
        </div>
      )}
    </Container>
  );
}

function StockUpdate() {
  const { id } = useParams();
  const [cantidad, setCantidad] = useState(0);
  const [operacion, setOperacion] = useState('sumar');
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await api.patch(`/api/productos/${encodeURIComponent(id)}/stock`, { cantidad: Number(cantidad), operacion });
      alert('Stock actualizado');
      navigate(`/productos/${encodeURIComponent(id)}`);
    } catch (err) {
      console.error(err);
      alert('Error actualizando stock');
    }
  }

  return (
    <Container>
      <h2 className="text-2xl mb-4">Actualizar Stock</h2>
      <form onSubmit={onSubmit} className="max-w-md space-y-3">
        <div>
          <label className="block text-sm">Operación</label>
          <select value={operacion} onChange={e => setOperacion(e.target.value)} className="w-full p-2 border rounded">
            <option value="sumar">Sumar</option>
            <option value="restar">Restar</option>
            <option value="establecer">Establecer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Cantidad</label>
          <input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded">Aplicar</button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border rounded">Cancelar</button>
        </div>
      </form>
    </Container>
  );
}

// --------------------------
// Ventas: listar y crear
// --------------------------
function VentasList() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchClienteId, setSearchClienteId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  async function fetchVentas() {
    setLoading(true);
    try {
      const res = await api.get('/api/ventas');
      setVentas(res.data.data || []);
    } catch (err) {
      console.error(err);
      alert('Error cargando ventas');
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchVentas(); }, []);

  // Buscar ventas por ID de cliente
  async function searchByCliente() {
    if (!searchClienteId.trim()) {
      return fetchVentas();
    }

    setLoading(true);
    try {
      // Primero obtenemos todas las ventas
      const res = await api.get('/api/ventas');
      const todasLasVentas = res.data.data || [];
      
      // Filtramos por cliente_id
      const ventasFiltradas = todasLasVentas.filter(venta => 
        venta.cliente_id && venta.cliente_id.toLowerCase().includes(searchClienteId.toLowerCase())
      );
      
      setVentas(ventasFiltradas);
    } catch (err) {
      console.error(err);
      alert('Error buscando ventas por cliente');
    } finally {
      setLoading(false);
    }
  }

  // Buscar ventas por rango de fechas
  async function searchByFecha() {
    if (!fechaInicio || !fechaFin) {
      alert('Por favor ingresa ambas fechas');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/api/ventas/rango', {
        params: { inicio: fechaInicio, fin: fechaFin }
      });
      setVentas(res.data.data || []);
    } catch (err) {
      console.error(err);
      alert('Error buscando ventas por fecha');
    } finally {
      setLoading(false);
    }
  }

  // Limpiar filtros
  function clearFilters() {
    setSearchClienteId("");
    setFechaInicio("");
    setFechaFin("");
    fetchVentas();
  }

  return (
    <Container>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl">Ventas</h2>
        <Link to="/ventas/nuevo" className="px-4 py-2 bg-indigo-600 text-white rounded">Nueva Venta</Link>
      </div>

      {/* Filtros de búsqueda */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <h3 className="font-semibold mb-3">Filtrar Ventas</h3>
        
        {/* Filtro por ID de cliente */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Buscar por ID de Cliente</label>
          <div className="flex gap-2">
            <input
              value={searchClienteId}
              onChange={(e) => setSearchClienteId(e.target.value)}
              placeholder="Ej: cli_1234567890"
              className="flex-1 p-2 border rounded"
            />
            <button 
              onClick={searchByCliente}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Filtro por rango de fechas */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Buscar por Rango de Fechas</label>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="p-2 border rounded"
            />
            <span>a</span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="p-2 border rounded"
            />
            <button 
              onClick={searchByFecha}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Botón para limpiar filtros */}
        <div>
          <button 
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Información de resultados */}
      {searchClienteId && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            Mostrando ventas para cliente: <strong>{searchClienteId}</strong>
            {ventas.length === 0 && " - No se encontraron ventas"}
          </p>
        </div>
      )}

      {fechaInicio && fechaFin && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800">
            Periodo: <strong>{fechaInicio}</strong> a <strong>{fechaFin}</strong>
            {ventas.length === 0 && " - No se encontraron ventas"}
          </p>
        </div>
      )}

      {/* Lista de ventas */}
      {loading ? (
        <div className="text-center py-4">Cargando ventas...</div>
      ) : ventas.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No se encontraron ventas
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-gray-600">
              Total de ventas: <strong>{ventas.length}</strong>
            </p>
            {!searchClienteId && !fechaInicio && (
              <button 
                onClick={fetchVentas}
                className="px-3 py-1 text-sm border rounded"
              >
                Actualizar
              </button>
            )}
          </div>

          {ventas.map(v => (
            <div key={v._id} className="bg-white p-4 rounded shadow">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">Venta {v._id}</p>
                  <p className="text-sm text-gray-600">
                    Cliente: {v.cliente_id || 'N/A'}
                    {v.cliente_nombre && ` (${v.cliente_nombre})`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${v.total || 0}</p>
                  <p className="text-sm">{v.fecha?.substring(0,10)}</p>
                  <p className="text-xs text-gray-500">
                    {v.fecha?.substring(11,16)}
                  </p>
                </div>
              </div>
              
              {/* Detalles de productos */}
              <div className="mt-2 text-sm">
                {v.productos && v.productos.map((item, index) => (
                  <div key={index} className="flex justify-between py-1 border-b last:border-b-0">
                    <span>{item.nombre} x{item.cantidad}</span>
                    <span>${item.subtotal}</span>
                  </div>
                ))}
              </div>

              {/* Información adicional */}
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>Método: {v.metodo_pago || 'efectivo'}</span>
                {v.cancelada && (
                  <span className="text-red-600 font-medium">CANCELADA</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}

function VentaForm() {
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  // Cargar productos y clientes
  useEffect(() => {
    (async () => {
      try {
        const [resProductos, resClientes] = await Promise.all([
          api.get("/api/productos"),
          api.get("/api/clientes"),
        ]);
        setProductos(resProductos.data.data || []);
        setClientes(resClientes.data.data || []);
      } catch {
        alert("Error cargando datos iniciales");
      }
    })();
  }, []);

  // Filtro de sugerencias mientras se escribe el nombre
  function handleClienteChange(e) {
    const value = e.target.value;
    setClienteNombre(value);
    if (!value.trim()) {
      setSugerencias([]);
      setClienteId("");
      return;
    }
    const filtrados = clientes.filter((c) =>
      c.nombre.toLowerCase().includes(value.toLowerCase())
    );
    setSugerencias(filtrados.slice(0, 5)); // máximo 5 sugerencias
  }

  // Seleccionar cliente
  function seleccionarCliente(c) {
    setClienteNombre(c.nombre);
    setClienteId(c._id);
    setSugerencias([]);
  }

  // Agregar ítem de producto
  function addItem() {
    setItems([...items, { producto_id: "", cantidad: 1 }]);
  }

  function updateItem(i, data) {
    const copy = [...items];
    copy[i] = { ...copy[i], ...data };
    setItems(copy);
  }

  // Registrar venta
  async function onSubmit(e) {
    e.preventDefault();
    if (!clienteId) return alert("Por favor selecciona un cliente válido");
    try {
      await api.post("/api/ventas", {
        cliente_id: clienteId,
        productos: items,
      });
      alert("Venta registrada correctamente");
      navigate("/ventas");
    } catch {
      alert("Error registrando venta");
    }
  }

  return (
    <Container>
      <h2 className="text-2xl mb-4">Nueva Venta</h2>
      <form onSubmit={onSubmit} className="space-y-3 max-w-2xl relative">
        {/* Campo con autocompletado de cliente */}
        <div className="relative">
          <label className="block font-medium mb-1">Cliente</label>
          <input
            value={clienteNombre}
            onChange={handleClienteChange}
            placeholder="Escribe el nombre del cliente"
            className="w-full p-2 border rounded"
          />
          {sugerencias.length > 0 && (
            <ul className="absolute z-10 bg-white border rounded w-full mt-1 shadow">
              {sugerencias.map((c) => (
                <li
                  key={c._id}
                  onClick={() => seleccionarCliente(c)}
                  className="px-3 py-2 hover:bg-indigo-100 cursor-pointer"
                >
                  {c.nombre} — <span className="text-gray-500 text-sm">{c.telefono}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Mostrar ID seleccionado */}
        {clienteId && (
          <p className="text-sm text-gray-600">
            <span className="font-semibold">ID del cliente:</span> {clienteId}
          </p>
        )}

        {/* Lista de productos */}
        <div className="space-y-3">
          <label className="block font-medium mb-1">Productos</label>
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={it.producto_id}
                onChange={(e) => updateItem(i, { producto_id: e.target.value })}
                className="flex-1 p-2 border rounded"
              >
                <option value="">Seleccionar producto</option>
                {productos.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={it.cantidad}
                onChange={(e) =>
                  updateItem(i, { cantidad: parseInt(e.target.value) })
                }
                className="w-24 p-2 border rounded"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-2 bg-gray-200 rounded"
          >
            + Agregar Producto
          </button>
        </div>

        {/* Botón de registro */}
        <button className="px-4 py-2 bg-indigo-600 text-white rounded">
          Registrar Venta
        </button>
      </form>
    </Container>
  );
}


// --------------------------
// Clientes (desde BD compartida)
// --------------------------
function ClientesList() {
  const [clientes, setClientes] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Cargar todos los clientes
  async function fetchClientes() {
    setLoading(true);
    try {
      const res = await api.get("/api/clientes");
      setClientes(res.data.data || []);
    } catch {
      alert("Error cargando clientes");
    } finally {
      setLoading(false);
    }
  }

  // Buscar clientes por nombre o ID
  async function onSearch(e) {
    e.preventDefault();
    const value = query.trim();
    if (!value) return fetchClientes();

    setLoading(true);
    try {
      let res;
      // Si parece un ID (contiene "cli" o empieza con un prefijo esperado)
      if (/^[a-zA-Z0-9_\-]+$/.test(value) && value.length > 6) {
        try {
          res = await api.get(`/api/clientes/${value}`);
          // Normalizamos para mostrarlo en la lista
          setClientes(res.data.data ? [res.data.data] : []);
        } catch {
          // si no existe ese ID, intentamos buscar por nombre
          res = await api.get("/api/clientes/search", {
            params: { nombre: value },
          });
          setClientes(res.data.data || []);
        }
      } else {
        // búsqueda por nombre
        res = await api.get("/api/clientes/search", {
          params: { nombre: value },
        });
        setClientes(res.data.data || []);
      }
    } catch {
      alert("Error buscando cliente");
      setClientes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClientes();
  }, []);

  return (
    <Container>
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-semibold">Clientes</h2>
        <Link
          to="/clientes/nuevo"
          className="px-4 py-2 bg-indigo-600 text-white rounded"
        >
          Nuevo
        </Link>
      </div>

      {/* Barra de búsqueda */}
      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente por nombre o ID"
          className="flex-1 p-2 border rounded"
        />
        <button className="px-4 py-2 bg-gray-200 rounded">Buscar</button>
      </form>

      {loading ? (
        <p>Cargando...</p>
      ) : clientes.length === 0 ? (
        <p className="text-gray-500">No se encontraron clientes.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clientes.map((c) => (
            <div key={c._id} className="bg-white p-3 rounded shadow">
              <p className="font-semibold">{c.nombre}</p>
              <p>Tel: {c.telefono}</p>
              <p className="text-sm text-gray-500">ID: {c._id}</p>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}

function ClienteForm() {
  const [form, setForm] = useState({ nombre: '', telefono: '', sucursales_visitadas: [] });
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/api/clientes', form);
      alert('Cliente creado');
      navigate('/clientes');
    } catch (err) { console.error(err); alert('Error creando cliente'); }
  }

  return (
    <Container>
      <h2 className="text-2xl mb-4">Nuevo Cliente</h2>
      <form onSubmit={onSubmit} className="max-w-md space-y-3">
        <div>
          <label className="block text-sm">Nombre</label>
          <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm">Teléfono</label>
          <input required value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} className="w-full p-2 border rounded" />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded">Crear</button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border rounded">Cancelar</button>
        </div>
      </form>
    </Container>
  );
}

// --------------------------
// Proveedores
// --------------------------

function ProveedoresList() {
  const [proveedores, setProveedores] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/proveedores');
        setProveedores(res.data.data || []);
      } catch {
        alert('Error cargando proveedores');
      }
    })();
  }, []);
  return (
    <Container>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl">Proveedores</h2>
        <Link to="/proveedores/nuevo" className="px-4 py-2 bg-indigo-600 text-white rounded">Nuevo</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {proveedores.map(p => (
          <div key={p._id} className="bg-white p-3 rounded shadow">
            <p className="font-semibold">{p.nombre}</p>
            <p className="text-sm text-gray-600">Contacto: {p.contacto}</p>
          </div>
        ))}
      </div>
    </Container>
  );
}

function ProveedorForm() {
  const [form, setForm] = useState({ nombre: '', contacto: '' });
  const navigate = useNavigate();
  async function onSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/api/proveedores', form);
      alert('Proveedor creado');
      navigate('/proveedores');
    } catch {
      alert('Error creando proveedor');
    }
  }
  return (
    <Container>
      <h2 className="text-2xl mb-4">Nuevo Proveedor</h2>
      <form onSubmit={onSubmit} className="max-w-md space-y-3">
        <input required value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Nombre" className="w-full p-2 border rounded"/>
        <input required value={form.contacto} onChange={e=>setForm({...form,contacto:e.target.value})} placeholder="Contacto" className="w-full p-2 border rounded"/>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded">Guardar</button>
      </form>
    </Container>
  );
}

// --------------------------
// Reportes
// --------------------------

function ReportesView() {
  const [stockBajo, setStockBajo] = useState([]);
  async function fetchStockBajo() {
    try {
      const res = await api.get('/api/productos/stock-bajo');
      setStockBajo(res.data.data);
    } catch {
      alert('Error obteniendo reporte');
    }
  }
  useEffect(() => { fetchStockBajo(); }, []);
  return (
    <Container>
      <h2 className="text-2xl mb-4">Reportes — Stock Bajo</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {stockBajo.map(p => (
          <div key={p._id} className="bg-white p-4 rounded shadow">
            <p className="font-semibold">{p.nombre}</p>
            <p>Stock actual: {p.stock_actual}</p>
            <p>Stock mínimo: {p.stock_minimo}</p>
          </div>
        ))}
      </div>
    </Container>
  );
}

// --------------------------
// Vista global & sincronización
// --------------------------
function GlobalView() {
  const [stats, setStats] = useState(null);
  const [sucursales, setSucursales] = useState([]); // arreglo con sucursales y sus productos
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar estadísticas globales
  async function fetchStats() {
    try {
      const res = await api.get("/api/global/estadisticas");
      setStats(res.data.data);
    } catch {
      alert("Error obteniendo estadísticas globales");
    }
  }

  // Cargar productos globales
  async function fetchProductos() {
    setLoading(true);
    try {
      const res = await api.get("/api/global/productos");
      const data = res.data?.data || [];
      setSucursales(data);
      setFiltered(data); // inicialmente igual
    } catch {
      alert("Error cargando productos globales");
    } finally {
      setLoading(false);
    }
  }

  // Buscar productos entre todas las sucursales
  async function onSearch(e) {
    e.preventDefault();
    if (!query.trim()) return setFiltered(sucursales);
    const resultado = sucursales.map((suc) => ({
      ...suc,
      productos: suc.productos.filter((p) =>
        p.nombre.toLowerCase().includes(query.toLowerCase())
      ),
    }));
    setFiltered(resultado);
  }

  useEffect(() => {
    fetchStats();
    fetchProductos();
  }, []);

  return (
    <Container>
      <h2 className="text-2xl font-semibold mb-4">Vista Global</h2>

      {/* ====== ESTADÍSTICAS ====== */}
      {!stats ? (
        <p>Cargando estadísticas...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Totales de la Red</h3>
            <p>Sucursales: {stats.total_sucursales}</p>
            <p>Productos: {stats.totales_red.productos}</p>
            <p>Ventas: {stats.totales_red.ventas}</p>
            <p>Monto total: ${stats.totales_red.monto_total_ventas}</p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Por Sucursal</h3>
            {stats.por_sucursal?.map((suc, i) => (
              <div key={i} className="mb-2 border-b pb-1">
                <p className="font-medium">{suc.nombre}</p>
                <p className="text-sm text-gray-600">
                  Productos: {suc.productos} | Ventas: {suc.ventas} | Monto: ${suc.monto_total}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== BUSCADOR ====== */}
      <form onSubmit={onSearch} className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto por nombre en todas las sucursales"
          className="flex-1 p-2 border rounded"
        />
        <button className="px-4 py-2 bg-gray-200 rounded">Buscar</button>
      </form>

      {/* ====== PRODUCTOS POR SUCURSAL ====== */}
      {loading ? (
        <p>Cargando productos...</p>
      ) : (
        <div className="space-y-8">
          {filtered.map((suc, i) => (
            <div key={i} className="bg-white p-4 rounded shadow">
              <h3 className="text-xl font-semibold mb-3">
                Sucursal {suc.sucursal}{" "}
                {suc.es_propia ? (
                  <span className="text-green-600 text-sm">(Propia)</span>
                ) : (
                  <span className="text-gray-500 text-sm">(Remota)</span>
                )}
              </h3>

              {suc.productos.length === 0 ? (
                <p className="text-gray-500">No hay productos registrados.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suc.productos.map((p) => (
                    <div
                      key={p._id}
                      className="border rounded p-3 hover:shadow transition"
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold">{p.nombre}</p>
                          <p className="text-sm text-gray-600">
                            {p.categoria || "Sin categoría"}
                          </p>
                        </div>
                        <p className="font-medium">${p.precio_venta}</p>
                      </div>
                      <div className="mt-2 text-sm">
                        <p>
                          Stock actual:{" "}
                          <span
                            className={
                              p.stock_actual < p.stock_minimo
                                ? "text-red-600 font-medium"
                                : "text-gray-700"
                            }
                          >
                            {p.stock_actual}
                          </span>
                        </p>
                        <p>Stock mínimo: {p.stock_minimo}</p>
                        <p className="text-xs text-gray-500">
                          Última actualización:{" "}
                          {new Date(p.fecha_actualizacion || p.fecha_registro).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}

function SyncStatus() {
  const [status, setStatus] = useState(null);

  async function fetchStatus() {
    try {
      const res = await api.get('/api/sync/status');
      setStatus(res.data);
    } catch (err) {
      console.error(err);
      alert('Error consultando estado de sincronización');
    }
  }

  useEffect(() => { fetchStatus(); }, []);

  async function forceSync() {
    if (!window.confirm('Forzar sincronización ahora?')) return;
    try {
      await api.post('/api/sync/force');
      alert('Sincronización manual solicitada');
      fetchStatus();
    } catch (err) { console.error(err); alert('Error forzando sincronización'); }
  }

  return (
    <Container>
      <h2 className="text-2xl mb-4">Estado de sincronización</h2>
      {!status ? <div>Cargando...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <p>Sucursal actual: {status.sucursal_actual}</p>
            <p>Sync propia: {status.databases.propia.active ? 'Activa' : 'Inactiva'}</p>
            <p>Sync compartida: {status.databases.compartida.active ? 'Activa' : 'Inactiva'}</p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <button onClick={forceSync} className="px-4 py-2 bg-red-600 text-white rounded">Forzar sincronización</button>
            <pre className="mt-3 text-xs overflow-auto" style={{maxHeight: 300}}>{JSON.stringify(status, null, 2)}</pre>
          </div>
        </div>
      )}
    </Container>
  );
}

// --------------------------
// App & Routes
// --------------------------
export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Routes>
          <Route path="/" element={<ProductosList />} />
            <Route path="/productos/nuevo" element={<ProductoForm isEdit={false} />} />
            <Route path="/productos/:id/editar" element={<ProductoForm isEdit={true} />} />
            <Route path="/productos/:id" element={<ProductoDetalle />} />
            <Route path="/productos/:id/stock" element={<StockUpdate />} />
            <Route path="/ventas" element={<VentasList />} />
            <Route path="/ventas/nuevo" element={<VentaForm />} />
            <Route path="/clientes" element={<ClientesList />} />
            <Route path="/clientes/nuevo" element={<ClienteForm />} />
            <Route path="/proveedores" element={<ProveedoresList />} />
            <Route path="/proveedores/nuevo" element={<ProveedorForm />} />
            <Route path="/reportes" element={<ReportesView />} />
            <Route path="/global" element={<GlobalView />} />
            <Route path="/sync" element={<SyncStatus />} />

          <Route path="*" element={<Container><h2>Ruta no encontrada</h2></Container>} />
        </Routes>
      </div>
    </Router>
  );
}

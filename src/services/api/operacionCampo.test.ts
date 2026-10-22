import { afterEach, describe, expect, it, vi } from 'vitest'
import { campoApi, todosCampo, urlCampo } from './operacionCampo'

afterEach(()=>vi.unstubAllGlobals())
describe('Contrato del cliente MOD-04',()=>{
  it('envía PUT autenticado, sin cookies, y el cuerpo de participantes',async()=>{
    const request=vi.fn().mockResolvedValue(new Response(JSON.stringify({cantidad_operarios:2}),{status:200}))
    vi.stubGlobal('fetch',request)
    await campoApi('actividades/1/participantes/',{metodo:'PUT',autorizacion:'Basic prueba',cuerpo:{operarios:[5,6]}})
    const [url,options]=request.mock.calls[0]
    expect(url).toBe('/api/v1/operacion-campo/actividades/1/participantes/')
    expect(options.method).toBe('PUT');expect(options.credentials).toBe('omit')
    expect(options.headers.get('Authorization')).toBe('Basic prueba')
    expect(JSON.parse(options.body)).toEqual({operarios:[5,6]})
  })
  it('mantiene los conflictos del servidor como errores visibles',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({codigo:'Conflicto',detalle:'El parte está cerrado'}),{status:409})))
    await expect(campoApi('actividades/1/participantes/')).rejects.toMatchObject({estado:409,detalle:'El parte está cerrado'})
  })
  it('carga todas las páginas del selector y no sigue enlaces externos',async()=>{
    const request=vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({results:[{id:1}],count:2,next:'https://externo.example/robar'})))
      .mockResolvedValueOnce(new Response(JSON.stringify({results:[{id:2}],count:2,next:null})))
    vi.stubGlobal('fetch',request)
    expect(await todosCampo('personal/',{activo:true})).toEqual([{id:1},{id:2}])
    expect(request.mock.calls[1][0]).toBe('/api/v1/operacion-campo/personal/?activo=true&page=2')
  })
  it('omite filtros vacíos y conserva caracteres como texto literal',()=>{
    expect(urlCampo('encargos/',{q:'jardín & poda',page:2,desde:''})).toBe('/api/v1/operacion-campo/encargos/?q=jard%C3%ADn+%26+poda&page=2')
  })
})

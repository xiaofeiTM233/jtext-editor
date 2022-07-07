import { NodeKey, SerializedEditorState } from "lexical"
import { createContext, useReducer } from "react"
import { ClickToken, HoverToken, ScoreToken, NbtToken, TranslateToken } from "../core/tellraw/model"
import { clone, createUID } from "../utils"

export type JSONEventObject = {
    id: string
    clickEvent: ClickToken
    hoverEvent: HoverToken
    type: 'text' | 'nbt' | 'selector' | 'score' | 'keybind' | 'translate'
    selector?: string
    score: ScoreToken
    nbt: NbtToken
    keybind?: string
    insertion?: string
    font?: string
    translate: TranslateToken
}

export function createJSONEventObject(id = createUID()): JSONEventObject {
    return {
        id,
        type: 'text',
        clickEvent: {
            action: 'run_command',
            value: '',
        },
        hoverEvent: {
            action: 'show_text',
            value: '',
        },
        score: {
            objective: '',
            name: '*',
        },
        nbt: {
            type: 'block',
            value: '',
            path: '',
            interpret: false,
            separator: '',
        },
        translate: {
            translate: '',
            with: '',
        }
        // selector: '',
        // keybind: '',
        // insertion: '',
        // font: '',
    }
}

interface JsonTile {
    id: string
    time: string
    data: SerializedEditorState
    text: string
}

export const defaultTplMap: Record<string, string> = {
    tellraw: '/tellraw @p ["",%s]',
    sign: '/give @p oak_sign{BlockEntityTag:{%s}}',
    book: '/give @p written_book{pages:[%s],title:"",author:"made by JText Editor"}',
    title: '/title @p title ["",%s]',
}


interface IState {
    eventList: JSONEventObject[]
    jsonList: JsonTile[]
    jsonIndex: number
    currentJson: JsonTile | null
    nodeMap: Record<string, NodeKey>
    width: number
    bgColor: string
    tplMap: Record<string, string>
    tplType: string
}

const defaultState: IState = {
    eventList: [],
    jsonList: [],
    jsonIndex: -1,
    currentJson: null,
    nodeMap: {},
    width: 100,
    bgColor: '#fff',
    tplMap: defaultTplMap,
    tplType: 'tellraw',
}

type Action =
    | { type: 'CreateEvent', id: string }
    | { type: 'UpdateEvent', eventListItem: JSONEventObject }
    | { type: 'AddEvent', eventListItem: JSONEventObject }
    | { type: 'RemoveEvent', id: string }
    | { type: 'CloneEvent', id: string, cloneId: string }

    | { type: 'UpdateCurrentJson', currentJson: JsonTile | null }

    | { type: 'AddJson', json: JsonTile }
    | { type: 'UpdateJson', json: JsonTile }
    | { type: 'UpdateJsonIndex', index: number }
    | { type: 'RemoveJsonByIndex', index: number }
    | { type: 'MoveJsonItem', index: number, offset: number }

    | { type: 'UpdateNodeMap', nodeMap: Record<string, NodeKey> }
    | { type: 'UpdateWidth', width: number }
    | { type: 'UpdateBgColor', bgColor: string }

    | { type: 'UpdateTplMap', tplMap: Record<string, string> }
    | { type: 'UpdateTplType', tplType: string }

    | { type: 'Load', state: IState }
    | { type: 'Reset' }

export const AppContext = createContext<[IState, (action: Action) => void]>([defaultState, () => {}])

function reducer(state: IState, action: Action) {

    const partialUpdate = (partialState: (Partial<IState> | void) | ((state: IState) => Partial<IState> | void)) => {
        let newState = typeof partialState === 'function'
            ? partialState(state)
            : partialState
        return { ...state, ...(newState || {}) }
    }

    switch (action.type) {
        case 'Reset':
            return defaultState
        case 'Load':
            return action.state
        case 'CreateEvent':
            return partialUpdate({
                eventList: [...state.eventList, createJSONEventObject(action.id)]
            })
        case 'AddEvent':
            return partialUpdate({
                eventList: [...state.eventList, action.eventListItem]
            })
        case 'UpdateEvent':
            return partialUpdate(({ eventList }) => {
                const newEventList = [...eventList]
                const id = action.eventListItem.id
                const index = newEventList.findIndex(item => item.id === id)
                if (index > -1) {
                    newEventList[index] = action.eventListItem
                    return {
                        eventList: newEventList
                    }
                }
            })
        case 'CloneEvent':
            return partialUpdate(({ eventList }) => {
                const newEventList = [...eventList]
                const { id, cloneId } = action
                const cloneOne = newEventList.find(item => item.id === cloneId)!
                newEventList.push({
                    ...clone(cloneOne),
                    id,
                })
                return {
                    eventList: newEventList
                }
            })
        case 'RemoveEvent':
            return partialUpdate(({ eventList: comments }) => {
                const id = action.id
                const index = comments.findIndex(item => item.id === id)
                comments.splice(index, 1)
                return {
                    eventList: [...comments]
                }
            })
        case 'UpdateCurrentJson':
            return partialUpdate({
                currentJson: action.currentJson
            })
        case 'AddJson':
            return partialUpdate(({ jsonList }) => {
                return {
                    jsonList: [...jsonList, action.json]
                }
            })
        case 'UpdateJson':
            return partialUpdate(({ jsonList }) => {
                const newJsonList = [...jsonList]
                newJsonList[state.jsonIndex] = action.json
                return {
                    jsonList: newJsonList,
                }
            })
        case 'UpdateJsonIndex':
            return partialUpdate({
                jsonIndex: action.index
            })
        case 'RemoveJsonByIndex':
            return partialUpdate(({ jsonList }) => {
                const newJsonList = [...jsonList]
                newJsonList.splice(action.index, 1)
                return {
                    jsonList: newJsonList
                }
            })
        case 'MoveJsonItem':
            return partialUpdate(({ jsonList }) => {
                const newJsonList = [...jsonList]
                newJsonList.splice(action.index + action.offset, 0, ...newJsonList.splice(action.index, 1))
                return {
                    jsonList: newJsonList
                }
            })
        case 'UpdateNodeMap':
            return partialUpdate({
                nodeMap: action.nodeMap
            })
        case 'UpdateWidth':
            return partialUpdate({
                width: action.width
            })
        case 'UpdateBgColor':
            return partialUpdate({
                bgColor: action.bgColor
            })
        case 'UpdateTplMap':
            return partialUpdate({
                tplMap: action.tplMap
            })
        case 'UpdateTplType':
            return partialUpdate({
                tplType: action.tplType
            })
        default:
            return state
    }
}

export function useAppReducer(): [IState, React.Dispatch<Action>] {
    return useReducer(reducer, defaultState)
}
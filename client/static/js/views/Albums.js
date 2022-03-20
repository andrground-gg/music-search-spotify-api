import AbstractView from './Abstract.js';
import {categories} from '../index.js';

export default class extends AbstractView {
    constructor(params) {
        super(params);
        this.category = categories.ALBUMS;
    }
    
    async getHTML() {
       return `
        <div class="container">           
            <div class="search-results">
                <div class="albums-list albums-list--whole-page"></div>
            </div>
        </div>
       `; 
    }
}
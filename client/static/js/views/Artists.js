import AbstractView from './Abstract.js';
import {categories} from '../index.js';

export default class extends AbstractView {
    constructor(params) {
        super(params);
        this.category = categories.ARTISTS;
    }
    
    async getHTML() {
       return `
        <div class="container">           
            <div class="search-results">
                <div class="artists-list artists-list--whole-page"></div>
            </div>
        </div>
       `; 
    }
}
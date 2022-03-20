import AbstractView from './Abstract.js';
import {categories} from '../index.js';

export default class extends AbstractView {
    constructor(params) {
        super(params);
        this.category = categories.ARTIST;
    }
    
    async getHTML() {
       return `
        <div class="container">   
            <div class="search-results">                                    
                <div class="tracks-list tracks-list--page-half"></div>                                                
                <div class="albums-list albums-list--page-half"></div>   
            </div>
        </div>
       `; 
    }
}